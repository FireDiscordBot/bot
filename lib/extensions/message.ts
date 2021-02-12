import {
  MessageReaction,
  WebhookClient,
  MessageEmbed,
  TextChannel,
  NewsChannel,
  Structures,
  DMChannel,
  Webhook,
  Message,
} from "discord.js";
import { PartialQuoteDestination } from "@fire/lib/interfaces/messages";
import { PaginatorInterface } from "@fire/lib/util/paginators";
import { CommandUtil } from "@fire/lib/util/commandutil";
import { constants } from "@fire/lib/util/constants";
import Filters from "@fire/src/modules/filters";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import * as centra from "centra";
import { Fire } from "@fire/lib/Fire";

const { emojis, reactions, regexes, imageExts } = constants;

export class FireMessage extends Message {
  paginator?: PaginatorInterface;
  member: FireMember;
  util?: CommandUtil;
  author: FireUser;
  guild: FireGuild;
  silent?: boolean;
  client: Fire;

  constructor(
    client: Fire,
    data: object,
    channel: DMChannel | TextChannel | NewsChannel
  ) {
    super(client, data, channel);
    this.silent = false;
    if (this.content?.toLowerCase().endsWith(" --silent")) {
      this.content = this.content.slice(0, this.content.length - 9).trimEnd();
      if (!this.attachments.size) this.silent = true;
    }
  }

  get language() {
    return this.author?.settings.has("utils.language")
      ? this.author.language
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

  async quote(
    destination: TextChannel | PartialQuoteDestination,
    quoter: FireMember,
    webhook?: WebhookClient
  ) {
    if (this.channel.type == "dm") return "dm";
    const channel = this.channel as TextChannel;
    if (this.author.system && !quoter.isSuperuser()) return "system";
    if (channel.nsfw && !destination?.nsfw) return "nsfw";
    const isLurkable =
      this.guild.roles.everyone.permissionsIn(channel).has("VIEW_CHANNEL") &&
      this.guild.roles.everyone
        .permissionsIn(channel)
        .has("READ_MESSAGE_HISTORY");
    let member: FireMember;
    if (this.guild.id == destination?.guild?.id) member = quoter;
    if (
      !this.guild.features.includes("DISCOVERABLE") ||
      (this.guild.features.includes("DISCOVERABLE") && !isLurkable)
    ) {
      if (this.guild.id != destination?.guild.id) {
        member = (await this.guild.members
          .fetch({ user: quoter, cache: false })
          .catch(() => {})) as FireMember;
      } else member = quoter;
    }

    if (!isLurkable)
      if (!member || !member.permissionsIn(this.channel).has("VIEW_CHANNEL"))
        return "permissions";

    const canUpload =
      !this.attachments.size ||
      // limit attachment size to 5mb to prevent issues
      this.attachments.filter((attachment) => attachment.size > 5242880).size ==
        0;
    const useWebhooks =
      (destination.guild as FireGuild).settings.get("utils.quotehooks", true) &&
      canUpload;
    return useWebhooks
      ? await this.webhookQuote(destination, quoter, webhook)
      : await this.embedQuote(destination, quoter);
  }

  private async webhookQuote(
    destination: TextChannel | PartialQuoteDestination,
    quoter: FireMember,
    webhook?: WebhookClient
  ) {
    let hook: Webhook | WebhookClient = webhook;
    if (!this.guild?.quoteHooks.has(destination.id)) {
      const hooks =
        destination instanceof TextChannel
          ? await destination.fetchWebhooks().catch(() => {})
          : null;
      if (hooks && !hook)
        hook = hooks
          ?.filter((hook) => !!hook.token && hook.channelID == destination.id)
          ?.first();
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
    } else hook = this.guild?.quoteHooks.get(destination.id);
    // if hook doesn't exist by now, something went wrong
    // and it's best to just ignore it
    if (!hook) return;
    if (hook instanceof Webhook && hook.channelID != destination.id) {
      this.guild.quoteHooks.delete(destination.id);
      return;
    }
    this.guild?.quoteHooks.set(destination.id, hook);
    let content = this.content;
    if (content) {
      let maskedMatch: RegExpExecArray;
      while ((maskedMatch = regexes.maskedLink.exec(this.content))) {
        const { name, link } = maskedMatch.groups;
        if (name && link && !this.webhookID && !quoter?.isSuperuser())
          content = content.replace(
            maskedMatch[0],
            `\\[${name}\\]\\(${link}\\)`
          );
      }
      const filters = this.client.getModule("filters") as Filters;
      content = filters.runReplace(content, quoter);
    }
    let attachments: { attachment: Buffer; name: string }[] = [];
    if (
      (destination instanceof TextChannel &&
        quoter.permissionsIn(destination).has("ATTACH_FILES")) ||
      (!(destination instanceof TextChannel) &&
        (destination.permissions & 0x8000) == 0x8000)
    ) {
      const names = this.attachments.map((attach) => attach.name);
      const attachReqs = await Promise.all(
        this.attachments.map((attachment) =>
          centra(attachment.url)
            .header("User-Agent", "Fire Discord Bot")
            .send()
            .catch(() => {})
        )
      ).catch(() => []);
      for (const [index, req] of attachReqs.entries()) {
        if (req && req.statusCode == 200)
          attachments.push({ attachment: req.body, name: names[index] });
      }
    }
    return await hook
      .send(content, {
        username: this.author.toString().replace(/#0000/gim, ""),
        avatarURL: this.author.displayAvatarURL({ size: 2048, format: "png" }),
        embeds: this.embeds.filter(
          (embed) =>
            !this.content.includes(embed.url) && !this.isImageEmbed(embed)
        ),
        files: attachments,
        allowedMentions: this.client.options.allowedMentions,
      })
      .catch(async () => {
        // this will ensure deleted webhooks are deleted
        // but also allow webhooks to be refreshed
        // even if the cached one still exists
        this.guild?.quoteHooks.delete(destination.id);
        return await this.embedQuote(destination, quoter);
      });
  }

  private isImageEmbed(embed: MessageEmbed) {
    return (
      !embed.title &&
      !embed.description &&
      !embed.timestamp &&
      !embed.color &&
      !embed.fields.length &&
      !embed.image &&
      !embed.author &&
      !embed.footer &&
      embed.url == embed.thumbnail.url
    );
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
      .setColor(
        this.member?.displayHexColor || quoter.displayHexColor || "#ffffff"
      )
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

  async runFilters() {
    if (!this.guild || this.author.bot) return;
    if (!this.member)
      await this.guild.members.fetch(this.author.id).catch(() => {});
    if (!this.member) return; // if we still don't have access to member, just ignore

    if (
      this.guild.settings.get("mod.antieveryone", false) &&
      (this.content.includes("@everyone") || this.content.includes("@here")) &&
      !this.member.hasPermission("MENTION_EVERYONE")
    )
      return await this.delete().catch(() => {});

    if (
      this.guild.settings.get("mod.antizws", false) &&
      regexes.zws.test(this.content) &&
      !this.member.isModerator()
    ) {
      regexes.zws.lastIndex = 0;
      return await this.delete().catch(() => {});
    }
    regexes.zws.lastIndex = 0;

    if (
      this.guild.settings.get("mod.antispoilers", false) &&
      regexes.spoilerAbuse.test(this.content) &&
      !this.member.isModerator()
    ) {
      regexes.spoilerAbuse.lastIndex = 0;
      return await this.delete().catch(() => {});
    }
    regexes.spoilerAbuse.lastIndex = 0;

    if (
      this.guild.settings.get("mod.antiselfbot", false) &&
      this.embeds.length &&
      this.embeds.filter(
        (embed) =>
          embed.type == "rich" &&
          (!embed.url || !this.content.includes(embed.url))
      ).length
    )
      return await this.delete().catch(() => {});
  }
}

Structures.extend("Message", () => FireMessage);
