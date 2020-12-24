import {
  APIMessageContentResolvable,
  MessageEditOptions,
  MessageReaction,
  WebhookClient,
  MessageEmbed,
  TextChannel,
  NewsChannel,
  Structures,
  APIMessage,
  DMChannel,
  Webhook,
  Message,
} from "discord.js";
import { PartialQuoteDestination } from "../interfaces/messages";
import { PaginatorInterface } from "../util/paginators";
import { CommandUtil } from "../util/commandutil";
import Filters from "../../src/modules/filters";
import { constants } from "../util/constants";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

const { emojis, reactions, regexes, imageExts } = constants;

export class FireMessage extends Message {
  paginator?: PaginatorInterface;
  member: FireMember;
  util?: CommandUtil;
  author: FireUser;
  guild: FireGuild;
  client: Fire;

  constructor(
    client: Fire,
    data: object,
    channel: DMChannel | TextChannel | NewsChannel
  ) {
    super(client, data, channel);
  }

  get language() {
    return this.author?.settings.get("utils.language")
      ? this.author.language.id == "en-US" && this.guild?.language.id != "en-US"
        ? this.guild?.language
        : this.author.language
      : this.guild?.language || this.client.getLanguage("en-US");
  }

  send(key: string = "", ...args: any[]) {
    return this.channel.send(this.language.get(key, ...args));
  }

  replyRaw(content: string, mention: boolean = false): Promise<Message> {
    return (
      // @ts-ignore
      this.client.api
        // @ts-ignore
        .channels(this.channel.id)
        .messages.post({
          data: {
            content,
            message_reference: { message_id: this.id },
            allowed_mentions: {
              ...this.client.options.allowedMentions,
              replied_user: mention,
            },
          },
        })
        .then(
          // @ts-ignore
          (m: object) => this.client.actions.MessageCreate.handle(m).message
        )
        .catch(() => {
          return this.channel.send(content);
        })
    );
  }

  success(
    key: string = "",
    ...args: any[]
  ): Promise<MessageReaction | Message | void> {
    if (!key && this.deleted) return;
    return !key
      ? this.react(reactions.success).catch(() => {})
      : this.channel.send(
          `${emojis.success} ${this.language.get(key, ...args)}`
        );
  }

  error(
    key: string = "",
    ...args: any[]
  ): Promise<MessageReaction | Message | void> {
    if (!key && this.deleted) return;
    return !key
      ? this.react(reactions.error).catch(() => {})
      : this.replyRaw(`${emojis.error} ${this.language.get(key, ...args)}`);
  }

  async edit(
    content:
      | APIMessageContentResolvable
      | MessageEditOptions
      | MessageEmbed
      | APIMessage,
    options?: MessageEditOptions | MessageEmbed
  ) {
    const start = +new Date();
    let error: Error;
    const edited = await super.edit(content, options).catch((e) => {
      error = e;
    });
    this.client.restPing = +new Date() - start;
    if (error) throw error;
    return edited as FireMessage;
  }

  async delete(options?: { timeout?: number; reason?: string }) {
    const start = +new Date();
    let error: Error;
    const deleted = await super.delete(options).catch((e) => {
      error = e;
    });
    this.client.restPing = +new Date() - start;
    if (error) throw error;
    return deleted as FireMessage;
  }

  async quote(
    destination: TextChannel | PartialQuoteDestination,
    quoter: FireMember,
    webhook?: WebhookClient
  ) {
    if (this.channel.type == "dm") return "dm";
    const channel = this.channel as TextChannel;
    if (this.author.system && !quoter.isSuperuser()) return "system";
    if (channel.nsfw && !destination?.nsfw) return "nsfw";
    let member: FireMember;
    if (
      !this.guild.features.includes("DISCOVERABLE") ||
      (this.guild.features.includes("DISCOVERABLE") &&
        this.channel.permissionOverwrites
          .get(this.guild.roles.everyone.id)
          .deny.has("VIEW_CHANNEL"))
    ) {
      if (this.guild.id != destination?.guild.id) {
        member = (await this.guild.members
          .fetch({ user: quoter, cache: false })
          .catch(() => {})) as FireMember;
      } else member = quoter;
      if (!member || !member.permissionsIn(this.channel).has("VIEW_CHANNEL"))
        return "permissions";
    }

    const useWebhooks = (destination.guild as FireGuild).settings.get(
      "utils.quotehooks",
      true
    );
    return useWebhooks
      ? await this.webhookQuote(destination, quoter, webhook)
      : await this.embedQuote(destination, quoter);
  }

  private async webhookQuote(
    destination: TextChannel | PartialQuoteDestination,
    quoter: FireMember,
    webhook?: WebhookClient
  ) {
    const hooks =
      destination instanceof TextChannel
        ? await destination.fetchWebhooks().catch(() => {})
        : null;
    let hook: Webhook | WebhookClient = webhook;
    if (hooks && !hook) hook = hooks?.filter((hook) => !!hook.token)?.first();
    if (!hook && destination instanceof TextChannel) {
      hook = await destination
        .createWebhook(`Fire Quotes #${destination.name}`, {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: (destination.guild as FireGuild).language.get(
            "QUOTE_WEBHOOK_CREATE_REASON"
          ) as string,
        })
        .catch(() => null);
      if (!hook) return await this.embedQuote(destination, quoter);
    }
    // if hook doesn't exist by now, something went wrong
    // and it's best to just ignore it
    if (!hook) return;
    let content: string = null;
    if (this.content) {
      content = this.content.replace("[", "\\[").replace("]", "\\]");
      const filters = this.client.getModule("filters") as Filters;
      content = filters.runReplace(content, quoter);
    }
    return await hook
      .send(content, {
        username: this.author.toString().replace("#0000", ""),
        avatarURL: this.author.displayAvatarURL({ size: 2048, format: "png" }),
        embeds: this.embeds,
        files: [...this.attachments.values()],
        allowedMentions: this.client.options.allowedMentions,
      })
      .catch(async () => {
        return await this.embedQuote(destination, quoter);
      });
  }

  private async embedQuote(
    destination: TextChannel | PartialQuoteDestination,
    quoter: FireMember
  ) {
    // PartialQuoteDestination needs to be set for type here
    // since this#quote can take either but it should never
    // actually end up at this point
    if (!(destination instanceof TextChannel)) return;
    const { language } = destination.guild as FireGuild;
    if (!this.content && this.author.bot && this.embeds?.length == 1) {
      return await destination.send(
        language.get(
          "QUOTE_EMBED_FROM",
          this.author.toString(),
          (this.channel as TextChannel).name
        ),
        this.embeds[0]
      );
    }
    const embed = new MessageEmbed()
      .setColor(this.member?.displayColor || quoter.displayColor || "#ffffff")
      .setTimestamp(this.createdAt)
      .setAuthor(
        this.author.toString(),
        this.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );
    if (this.content) {
      let content = this.content;
      const imageMatches = regexes.imageURL.exec(content);
      if (imageMatches) {
        embed.setImage(imageMatches[0]);
        content = content.replace(imageMatches[0], "");
      }
      embed.setDescription(content);
    }
    embed.addField(
      language.get("JUMP_URL"),
      `[${language.get("CLICK_TO_VIEW")}](${this.url})`
    );
    if (this.attachments?.size) {
      if (
        this.attachments.size == 1 &&
        imageExts.filter((ext) => this.attachments.first().url.endsWith(ext))
          .length &&
        !embed.image?.url
      )
        embed.setImage(this.attachments.first().url);
      else {
        for (const attachment of this.attachments.values()) {
          embed.addField(
            language.get("ATTACHMENT"),
            `[${attachment.name}](${attachment.url})`
          );
        }
      }
    }
    if (this.channel != destination) {
      if (this.guild.id != destination.guild.id)
        embed.setFooter(
          language.get(
            "QUOTE_EMBED_FOOTER_ALL",
            quoter,
            (this.channel as TextChannel).name,
            this.guild.name
          )
        );
      else
        embed.setFooter(
          language.get(
            "QUOTE_EMBED_FOOTER_SOME",
            quoter,
            (this.channel as TextChannel).name
          )
        );
    } else embed.setFooter(language.get("QUOTE_EMBED_FOOTER", quoter));
    return await destination.send(embed).catch(() => {});
  }
}

Structures.extend("Message", () => FireMessage);
