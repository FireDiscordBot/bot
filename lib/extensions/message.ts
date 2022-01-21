import * as sanitizer from "@aero/sanitizer";
import { Fire } from "@fire/lib/Fire";
import { PartialQuoteDestination } from "@fire/lib/interfaces/messages";
import { CommandUtil } from "@fire/lib/util/commandutil";
import {
  constants,
  GuildTextChannel,
  i18nOptions,
} from "@fire/lib/util/constants";
import Filters from "@fire/src/modules/filters";
import * as centra from "centra";
import {
  Channel,
  Collection,
  DiscordAPIError,
  DMChannel,
  EmojiIdentifierResolvable,
  GuildChannel,
  Message,
  MessageAttachment,
  MessageEmbed,
  MessagePayload,
  MessageReaction,
  NewsChannel,
  Permissions,
  ReplyMessageOptions,
  Structures,
  ThreadChannel,
  Webhook,
  WebhookClient,
} from "discord.js";
import { RawMessageData } from "discord.js/typings/rawDataTypes";
import Semaphore from "semaphore-async-await";
import { LanguageKeys } from "../util/language";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";
import { FireVoiceChannel } from "./voicechannel";

const { emojis, reactions, regexes, imageExts, audioExts, videoExts } =
  constants;

export class FireMessage extends Message {
  declare channel: DMChannel | FireTextChannel | NewsChannel | ThreadChannel;
  invWtfResolved: Collection<string, { invite?: string; url?: string }>;
  declare member: FireMember;
  declare guild: FireGuild;
  declare author: FireUser;
  declare client: Fire;
  starLock: Semaphore;
  selfDelete: boolean;
  util?: CommandUtil;
  silent?: boolean;

  constructor(client: Fire, data: RawMessageData) {
    super(client, data);
    this.silent = false;
    this.content = this.content ?? "";
    if (this.content?.toLowerCase().endsWith(" --silent")) {
      this.content = this.content.slice(0, this.content.length - 9).trimEnd();
      if (!this.attachments.size) this.silent = true;
    }
    const language = this.guild ? this.guild?.language : this.author?.language;
    if (language)
      if (this.type == "RECIPIENT_ADD" && this.channel instanceof ThreadChannel)
        this.content = language.get("TICKET_RECIPIENT_ADD", {
          author: this.author.toString(),
          added: this.mentions.users.first()?.toString(),
        }) as string;
      else if (
        this.type == "RECIPIENT_REMOVE" &&
        this.channel instanceof ThreadChannel
      )
        this.content = language.get("TICKET_RECIPIENT_REMOVE", {
          author: this.author.toString(),
          removed: this.mentions.users.first()?.toString(),
        }) as string;
      else if (
        this.type == "CHANNEL_NAME_CHANGE" &&
        this.channel instanceof ThreadChannel
      )
        this.content = language.get("TICKET_THREAD_RENAME", {
          author: this.author.toString(),
          name: "**" + this.cleanContent + "**",
        });

    this.invWtfResolved = new Collection();
  }

  get language() {
    return (
      (this.author?.settings.has("utils.language")
        ? this.author.language
        : this.guild?.language) ?? this.client.getLanguage("en-US")
    );
  }

  get paginator() {
    return this.client.util.paginators.get(this.id) ?? null;
  }

  // TODO: remove when djs Util.removeMentions is removed
  // @ts-ignore (it is a getter, not a property)
  get cleanContent() {
    return this.content == null
      ? null
      : this.content
          .replace(/<@!?[0-9]+>/g, (input) => {
            const id = input.replace(/<|!|>|@/g, "");
            if (this.channel.type === "DM") {
              const user = this.channel.client.users.cache.get(id);
              return user ? `@${user.username}` : input;
            }

            const member = this.channel.guild.members.cache.get(id);
            if (member) {
              return `@${member.displayName}`;
            } else {
              const user = this.channel.client.users.cache.get(id);
              return user ? `@${user.username}` : input;
            }
          })
          .replace(/<#[0-9]+>/g, (input) => {
            const mentionedChannel = this.client.channels.cache.get(
              input.replace(/<|#|>/g, "")
            );
            return mentionedChannel
              ? `#${(mentionedChannel as GuildChannel).name}`
              : input;
          })
          .replace(/<@&[0-9]+>/g, (input) => {
            if (this.channel.type === "DM") return input;
            const role = this.channel.guild.roles.cache.get(
              input.replace(/<|@|>|&/g, "")
            );
            return role ? `@${role.name}` : input;
          });
  }

  send(key?: LanguageKeys, args?: i18nOptions) {
    if (this.channel.deleted) return;
    return this.channel.send({
      content: this.language.get(key, args),
      allowedMentions: args?.allowedMentions,
      components: args?.components,
      reply: args?.reply,
    });
  }

  async reply(options: string | MessagePayload | ReplyMessageOptions) {
    if (
      this.channel.deleted ||
      (this.guild && !this.guild.me?.permissions.has("READ_MESSAGE_HISTORY"))
    )
      return this; // we need to return a message to prevent issues so just return this
    return (await super.reply(options)) as FireMessage;
  }

  success(
    key?: LanguageKeys,
    args?: i18nOptions
  ): Promise<MessageReaction | Message | void> {
    if ((!key && this.deleted) || this.channel.deleted) return;
    return !key
      ? this.react(reactions.success).catch(() => {})
      : this.channel.send({
          content: this.language.getSuccess(key, args),
          allowedMentions: args?.allowedMentions,
          components: args?.components,
          reply: args?.reply,
        });
  }

  warn(
    key?: LanguageKeys,
    args?: i18nOptions
  ): Promise<MessageReaction | Message | void> {
    if ((!key && this.deleted) || this.channel.deleted) return;
    return !key
      ? this.react(reactions.warning).catch(() => {})
      : this.reply({
          content: this.language.getWarning(key, args),
          allowedMentions: args?.allowedMentions,
          components: args?.components,
          failIfNotExists: false,
        });
  }

  error(
    key?: LanguageKeys,
    args?: i18nOptions
  ): Promise<MessageReaction | Message | void> {
    if ((!key && this.deleted) || this.channel.deleted) return;
    return !key
      ? this.react(reactions.error).catch(() => {})
      : this.reply({
          content: this.language.getError(key, args),
          allowedMentions: args?.allowedMentions,
          components: args?.components,
          failIfNotExists: false,
        });
  }

  react(emoji: EmojiIdentifierResolvable) {
    if (
      (this.channel instanceof ThreadChannel && this.channel.archived) ||
      this.channel.deleted
    )
      return;
    if (process.env.USE_LITECORD == "true")
      return super.react(emoji).catch(() => this.reactions.cache.first());
    return super.react(emoji);
  }

  hasExperiment(id: number, bucket: number | number[]) {
    // if (this.client.config.dev) return true;
    const experiment = this.client.experiments.get(id);
    if (!experiment) return false;
    else if (!experiment.active) return true;
    else if (experiment.kind == "guild" && !this.guild) return false;
    else if (experiment.kind == "guild")
      return this.guild.hasExperiment(id, bucket);
    else return this.author.hasExperiment(id, bucket);
  }

  async delete(options?: { timeout: number }) {
    if (options?.timeout) await this.client.util.sleep(options.timeout);
    // e.g. if deleted before timeout finishes
    // (which is the reason why timeout was removed)
    // https://github.com/discordjs/discord.js/pull/4999
    if (this.deleted) return this;
    return (await super.delete().then((m: FireMessage) => {
      m.selfDelete = true;
      return m;
    })) as FireMessage;
  }

  async quote(
    destination: GuildTextChannel | ThreadChannel | PartialQuoteDestination,
    quoter: FireMember,
    webhook?: WebhookClient
  ) {
    if (this.channel.type == "DM") return "dm";
    let thread: ThreadChannel;
    if (destination instanceof ThreadChannel) {
      // we can't assign thread to destination since we're reassigning it
      thread = this.client.channels.cache.get(destination.id) as ThreadChannel;
      destination = destination.parent as FireTextChannel;
    }

    const channel =
      this.channel instanceof ThreadChannel
        ? (this.channel.parent as FireTextChannel)
        : (this.channel as FireTextChannel);
    if (this.author.system && !quoter.isSuperuser()) return "system";
    if (channel.nsfw && !destination?.nsfw) return "nsfw";
    const isLurkable =
      this.guild.roles.everyone
        .permissionsIn(channel)
        .has(Permissions.FLAGS.VIEW_CHANNEL) &&
      this.guild.roles.everyone
        .permissionsIn(channel)
        .has(Permissions.FLAGS.READ_MESSAGE_HISTORY);
    let member: FireMember;
    if (this.guild.id == destination?.guild?.id) member = quoter;
    if (
      !this.guild.features?.includes("DISCOVERABLE") ||
      (this.guild.features?.includes("DISCOVERABLE") && !isLurkable)
    ) {
      if (this.guild.id != destination?.guild.id) {
        member = (await this.guild.members
          .fetch({ user: quoter, cache: false })
          .catch(() => {})) as FireMember;
      } else member = quoter;
    }

    // check thread members if private thread
    if (this.channel.type.endsWith("thread")) {
      const member = await (this.channel as ThreadChannel).members.fetch(
        quoter,
        { cache: false }
      );
      if (!member) return "permissions";
    } else if (!isLurkable)
      if (
        !member ||
        !member.permissionsIn(channel).has(Permissions.FLAGS.VIEW_CHANNEL)
      )
        return "permissions";

    const canUpload =
      !this.attachments.size ||
      // limit attachment size to 5mb to prevent issues
      this.attachments.filter((attachment) => attachment.size > 5242880).size ==
        0;
    const useWebhooks =
      (!!webhook ||
        ((destination.guild as FireGuild).settings.get<boolean>(
          "utils.quotehooks",
          true
        ) &&
          typeof destination.fetchWebhooks == "function" &&
          typeof destination.createWebhook == "function")) &&
      canUpload;

    return useWebhooks
      ? await this.webhookQuote(destination, quoter, webhook, thread)
      : await this.embedQuote(thread ?? destination, quoter);
  }

  private async webhookQuote(
    destination: GuildTextChannel | PartialQuoteDestination,
    quoter: FireMember,
    webhook?: WebhookClient,
    thread?: ThreadChannel
  ) {
    let hook: Webhook | WebhookClient = webhook;
    if (!this.guild?.quoteHooks) this.guild.quoteHooks = new Collection();
    if (!this.guild?.quoteHooks.has(destination.id)) {
      const hooks =
        typeof destination.fetchWebhooks == "function"
          ? await destination.fetchWebhooks().catch(() => {})
          : null;
      if (hooks && !hook)
        hook = hooks
          ?.filter((hook) => !!hook.token && hook.channelId == destination.id)
          ?.first();
      if (!hook && typeof destination.createWebhook == "function") {
        hook = await destination
          .createWebhook(
            `Fire Quotes #${
              destination.name ? destination.name : destination.id
            }`,
            {
              avatar: this.client.user.displayAvatarURL({
                size: 2048,
                format: "png",
              }),
              reason: (destination.guild as FireGuild).language.get(
                "QUOTE_WEBHOOK_CREATE_REASON"
              ) as string,
            }
          )
          .catch(() => null);
        if (!hook) return await this.embedQuote(destination, quoter);
      }
    } else hook = this.guild?.quoteHooks.get(destination.id);
    // if hook doesn't exist by now, something went wrong
    // and it's best to just ignore it
    if (!hook) return;
    if (hook instanceof Webhook && hook.channelId != destination.id) {
      this.guild.quoteHooks.delete(destination.id);
      return;
    }
    this.guild?.quoteHooks.set(destination.id, hook);
    let content = this.content;
    if (content) {
      if (!quoter?.isSuperuser()) {
        content = content.replace(regexes.maskedLink, "\\[$1\\]\\($2)");
        const filters = this.client.getModule("filters") as Filters;
        content = await filters
          .runReplace(content, quoter)
          .catch(() => content);
      }
      for (const [, user] of this.mentions.users)
        content = content.replace((user as FireUser).toMention(), `@${user}`);
      for (const [, role] of this.mentions.roles)
        content = content.replace(
          role.toString(),
          `@${role.name ?? "Unknown Role"}`
        );
      for (const [, channel] of this.mentions.channels)
        if (channel instanceof GuildChannel)
          content = content.replace(channel.toString(), `#${channel.name}`);
      if (content.length > 2000) return "QUOTE_PREMIUM_INCREASED_LENGTH";
    }
    let attachments: {
      attachment: Buffer;
      name: string;
      description?: string;
    }[] = [];
    if (
      ((destination instanceof FireTextChannel ||
        destination instanceof FireVoiceChannel ||
        destination instanceof NewsChannel) &&
        quoter
          .permissionsIn(destination)
          .has(Permissions.FLAGS.ATTACH_FILES)) ||
      (!(
        destination instanceof FireTextChannel ||
        destination instanceof FireVoiceChannel ||
        destination instanceof NewsChannel
      ) &&
        (BigInt(destination.permissions) & 32768n) == 32768n)
    ) {
      const info = this.attachments.map((attach) => ({
        name: attach.name,
        description: attach.description,
      }));
      const attachReqs = await Promise.all(
        this.attachments.map((attachment) =>
          centra(attachment.url)
            .header("User-Agent", this.client.manager.ua)
            .send()
            .catch(() => {})
        )
      ).catch(() => []);
      for (const [index, req] of attachReqs.entries()) {
        if (req && req.statusCode == 200)
          attachments.push({
            attachment: req.body,
            name: info[index].name,
            description: info[index].description,
          });
      }
    }
    const member =
      this.member ??
      ((await this.guild.members
        .fetch(this.author)
        .catch(() => null)) as FireMember);
    return await hook
      .send({
        content: content.length ? content : null,
        username:
          member && member.nickname
            ? `${member.nickname} (${this.author
                .toString()
                .replace(/#0000/gim, "")})`
            : this.author.toString().replace(/#0000/gim, ""),
        avatarURL: (member ?? this.author).displayAvatarURL({
          size: 2048,
          format: "png",
        }),
        embeds: this.embeds.filter(
          (embed) =>
            !this.content?.includes(embed.url) && !this.isImageEmbed(embed)
        ),
        files: attachments.map((data) =>
          new MessageAttachment(data.attachment, data.name).setDescription(
            data.description
          )
        ),
        allowedMentions: this.client.options.allowedMentions,
        threadId: thread?.id,
        components: this.components,
      })
      .catch(async () => {
        // this will ensure deleted webhooks are deleted
        // but also allow webhooks to be refreshed
        // even if the cached one still exists
        this.guild?.quoteHooks.delete(destination.id);
        return await this.embedQuote(thread ?? destination, quoter);
      });
  }

  private isImageEmbed(embed: MessageEmbed) {
    let embedURL: URL, thumbURL: URL;
    try {
      embedURL = new URL(embed.url);
      thumbURL = new URL(embed.thumbnail.url);
    } catch {}
    return (
      !embed.title &&
      !embed.description &&
      !embed.timestamp &&
      !embed.color &&
      !embed.fields.length &&
      !embed.image &&
      !embed.author &&
      !embed.footer &&
      (embed.url == embed.thumbnail.url ||
        ((embedURL?.host == "imgur.com" || embedURL?.host == "i.imgur.com") &&
          thumbURL?.host == "i.imgur.com"))
    );
  }

  private async embedQuote(
    destination: GuildTextChannel | ThreadChannel | PartialQuoteDestination,
    quoter: FireMember
  ) {
    // PartialQuoteDestination needs to be set for type here
    // since this#quote can take either but it should never
    // actually end up at this point
    if (
      !(destination instanceof Channel) &&
      !(destination instanceof ThreadChannel)
    )
      return;
    const { language } = destination.guild as FireGuild;
    const extraEmbeds: MessageEmbed[] = [];
    if (!this.content && this.author.bot && this.embeds.length) {
      return await destination.send({
        content: language.get("QUOTE_EMBED_FROM", {
          author: this.author.toString(),
          channel: (this.channel as FireTextChannel).name,
        }),
        embeds: this.embeds,
      });
    } else if (this.author.bot && this.embeds.length)
      extraEmbeds.push(...this.embeds);
    const member =
      this.member ??
      ((await this.guild.members
        .fetch(this.author)
        .catch(() => null)) as FireMember);
    const embed = new MessageEmbed()
      .setColor(member?.displayColor || quoter.displayColor)
      .setTimestamp(this.createdAt)
      .setAuthor({
        name:
          member && member.nickname
            ? `${member.nickname} (${this.author
                .toString()
                .replace(/#0000/gim, "")})`
            : this.author.toString().replace(/#0000/gim, ""),
        iconURL: (member ?? this.author).displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      });
    if (this.content) {
      let content = this.content;
      const imageMatches = regexes.imageURL.exec(content);
      if (imageMatches) {
        embed.setImage(imageMatches[0]);
        content = content.replace(imageMatches[0], "");
      }
      content = content.replace(regexes.maskedLink, "\\[$1\\]\\($2)");
      const filters = this.client.getModule("filters") as Filters;
      content = await filters.runReplace(content, quoter);
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
          language.get("QUOTE_EMBED_FOOTER_ALL", {
            user: quoter.toString(),
            channel: (this.channel as FireTextChannel).name,
            guild: this.guild.name,
          })
        );
      else
        embed.setFooter(
          language.get("QUOTE_EMBED_FOOTER_SOME", {
            user: quoter.toString(),
            channel: (this.channel as FireTextChannel).name,
          })
        );
    } else
      embed.setFooter(
        language.get("QUOTE_EMBED_FOOTER", { user: quoter.toString() })
      );
    return await destination
      .send({ embeds: [embed, ...extraEmbeds], components: this.components })
      .catch(() => {});
  }

  async star(
    messageReaction: MessageReaction,
    user: FireUser,
    action: "add" | "remove"
  ) {
    if (this.partial) await this.fetch().catch(() => {}); // needed to get initial reaction counts and author

    // same condition, checks if still partial
    if (this.partial) return;
    else if (user?.id == this.author?.id || user.bot) return;

    const starEmoji: string = this.guild.settings
      .get("starboard.emoji", "⭐")
      .trim();
    let stars = this.reactions.cache.get(starEmoji)?.count || 0;

    const starboard = this.guild.starboard;
    if (!starboard || this.channel.id == starboard.id) return;

    if (!this.guild.starboardReactions)
      await this.guild.loadStarboardReactions();

    if (!this.guild.starboardReactions.has(this.id)) {
      const inserted = await this.client.db
        .query(
          "INSERT INTO starboard_reactions (gid, mid, reactions) VALUES ($1, $2, $3);",
          [this.guild.id, this.id, stars]
        )
        .catch(() => {});
      if (!inserted) return;
      else this.guild.starboardReactions.set(this.id, stars);
    } else {
      let cachedStars = this.guild.starboardReactions.get(this.id);
      if (action == "add") cachedStars++;
      else if (action == "remove") cachedStars--;
      // if this is false, we've (probably) drifted too much so we use the reaction count instead of the cached count
      if (
        (cachedStars > stars && cachedStars - stars >= 8) ||
        (stars > cachedStars && stars - cachedStars >= 8)
      )
        stars = cachedStars;
      stars > 0
        ? this.guild.starboardReactions.set(this.id, stars)
        : this.guild.starboardReactions.delete(this.id);
      await this.client.db
        .query(
          stars > 0
            ? "UPDATE starboard_reactions SET reactions=$1 WHERE gid=$2 AND mid=$3"
            : "DELETE FROM starboard_reactions WHERE gid=$1 AND mid=$2;",
          stars > 0 ? [stars, this.guild.id, this.id] : [this.guild.id, this.id]
        )
        .catch(() => {});
    }

    const minimum = this.guild.settings.get<number>("starboard.minimum", 5);
    const emoji = messageReaction.emoji.toString();
    if (!this.guild.starboardMessages) await this.guild.loadStarboardMessages();
    if (stars >= minimum) {
      if (!this.starLock) this.starLock = new Semaphore(1);
      await this.starLock.acquire();
      setTimeout(() => {
        this.starLock.release();
      }, 3500);
      const [content, embed] = this.getStarboardMessage(emoji, stars);
      if (this.guild.starboardMessages.has(this.id)) {
        const message = (await starboard.messages
          .fetch(this.guild.starboardMessages.get(this.id))
          .catch((e) => {
            if (e instanceof DiscordAPIError && e.code == 10008) {
              this.guild.starboardMessages.delete(this.id);
              this.client.db.query(
                "DELETE FROM starboard WHERE gid=$1 AND original=$2 AND board=$3;",
                [
                  this.guild.id,
                  this.id,
                  this.guild.starboardMessages.get(this.id),
                ]
              );
            }
          })) as FireMessage;
        if (message)
          return await message
            .edit({ content, embeds: [embed] })
            .catch(() => {});
      } else {
        const message = await starboard
          .send({ content, embeds: [embed] })
          .catch(() => {});
        if (!message) return;
        this.guild.starboardMessages.set(this.id, message.id);
        await this.client.db
          .query(
            "INSERT INTO starboard (gid, original, board) VALUES ($1, $2, $3);",
            [this.guild.id, this.id, message.id]
          )
          .catch(() => {});
        return message;
      }
    } else if (this.guild.starboardMessages.has(this.id)) {
      if (!this.starLock) this.starLock = new Semaphore(1);
      await this.starLock.acquire();
      setTimeout(() => {
        this.starLock.release();
      }, 3500);
      const message = (await starboard.messages
        .fetch(this.guild.starboardMessages.get(this.id))
        .catch(() => {})) as FireMessage;
      if (!message) return;
      const deleted = await message.delete().catch(() => {});
      if (deleted)
        return await this.client.db
          .query("DELETE FROM starboard WHERE gid=$1 AND board=$2;", [
            this.guild.id,
            message.id,
          ])
          .catch(() => {});
    }
  }

  getStarboardMessage(emoji: string, stars: number): [string, MessageEmbed] {
    const embed = new MessageEmbed()
      .setTimestamp(this.createdTimestamp)
      .setAuthor({
        name: this.author.toString(),
        iconURL: this.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(this.member?.displayColor ?? "#FFFFFF")
      .setFooter(this.id);
    if (this.content) embed.setDescription(this.content);
    if (this.embeds.length) {
      const first = this.embeds[0];
      if (!embed.description && first.description)
        embed.setDescription(first.description);
      if (
        this.isImageEmbed(first) &&
        this.content.trim() == first.thumbnail.url
      ) {
        embed.setImage(first.thumbnail.url);
        delete embed.description;
      } else if (first.image) embed.setImage(first.image.url);

      if (first.title) embed.setTitle(first.title);
      if (first.fields) embed.fields.push(...first.fields);
    } else if (this.attachments.size) {
      for (const [, attachment] of this.attachments) {
        if (imageExts.some((ext) => attachment.name.endsWith(ext))) {
          embed.setImage(attachment.proxyURL);
          break;
        }

        if (videoExts.some((ext) => attachment.name.endsWith(ext))) {
          if (
            embed.fields.find(
              (field) =>
                field.name == "\u200b" &&
                field.value ==
                  this.guild.language.get("STARBOARD_CONTAINS_VIDEO")
            )
          )
            continue;
          else if (embed.length < 6000 && embed.fields.length < 25)
            embed.addField(
              "\u200b",
              this.guild.language.get("STARBOARD_CONTAINS_VIDEO")
            );
        }

        if (audioExts.some((ext) => attachment.name.endsWith(ext))) {
          if (
            embed.fields.find(
              (field) =>
                field.name == "\u200b" &&
                field.value ==
                  this.guild.language.get("STARBOARD_CONTAINS_AUDIO")
            )
          )
            continue;
          else if (embed.length < 6000 && embed.fields.length < 25)
            embed.addField(
              "\u200b",
              this.guild.language.get("STARBOARD_CONTAINS_AUDIO")
            );
        }
      }
    }

    if (
      embed.description &&
      !embed.fields.length &&
      embed.description.length < 1890
    )
      embed.setDescription(
        embed.description +
          `\n\n[${this.guild.language.get("STARBOARD_JUMP_TO")}](${this.url})`
      );
    else if (!embed.description && !embed.fields.length)
      embed.setDescription(
        `[${this.guild.language.get("STARBOARD_JUMP_TO")}](${this.url})`
      );
    else if (embed.length < 6000 && embed.fields.length < 25)
      embed.addField(
        "\u200b",
        `[${this.guild.language.get("STARBOARD_JUMP_TO")}](${this.url})`
      );
    return [`${emoji} **${stars}** | ${this.channel}`, embed];
  }

  async runAntiFilters() {
    if (!this.guild || this.author.bot) return;
    if (!this.member || this.member.partial)
      await this.guild.members.fetch(this.author.id).catch(() => {});
    if (!this.member) return; // if we still don't have access to member, just ignore

    if (
      this.guild.settings.get<boolean>("mod.antieveryone", false) &&
      (this.content?.includes("@everyone") ||
        this.content?.includes("@here")) &&
      !this.member.permissions.has(Permissions.FLAGS.MENTION_EVERYONE)
    )
      return await this.delete().catch(() => {});

    if (
      this.guild.settings.get<boolean>("mod.antizws", false) &&
      // some emojis use \u200d (e.g. trans flag) so we replace all unicode emoji before checking for zero width characters
      regexes.zws.test(this.content.replace(regexes.unicodeEmoji, "")) &&
      !this.member.isModerator()
    ) {
      regexes.zws.lastIndex = 0;
      return await this.delete().catch(() => {});
    }
    regexes.zws.lastIndex = 0;

    if (
      this.guild.settings.get<boolean>("mod.antispoilers", false) &&
      regexes.spoilerAbuse.test(this.content) &&
      !this.member.isModerator()
    ) {
      regexes.spoilerAbuse.lastIndex = 0;
      return await this.delete().catch(() => {});
    }
    regexes.spoilerAbuse.lastIndex = 0;

    if (
      this.guild.settings.get<boolean>("mod.antiselfbot", false) &&
      this.embeds.length &&
      this.embeds.filter(
        (embed) =>
          embed.type == "rich" &&
          (!embed.url || !this.content?.includes(embed.url))
      ).length
    )
      return await this.delete().catch(() => {});
  }

  async runPhishFilters() {
    if (!this.guild || !this.guild?.hasExperiment(936071411, [1, 2])) return;
    const lowerContent = sanitizer(
      (this.content + (this.embeds.map((e) => e.description).join(" ") ?? ""))
        .toLowerCase()
        .replace(/\s/gim, "")
        .replace(regexes.zws, "")
    );
    const triggerFilter = async (match?: string) => {
      let embedsHaste: { url: string; raw: string };
      if (this.embeds.length)
        embedsHaste = await this.client.util.haste(
          JSON.stringify(this.embeds.map((e) => e.toJSON())),
          true,
          "json",
          true
        );
      const URLs = [];
      try {
        let urlMatch: RegExpExecArray;
        while ((urlMatch = regexes.URL.exec(this.content)))
          if (urlMatch?.length) URLs.push(urlMatch[0]);
      } catch {}
      let linkHaste: { url: string; raw: string };
      if (URLs.length)
        linkHaste = await this.client.util.haste(
          JSON.stringify(URLs),
          true,
          "json",
          true
        );
      this.client.influx([
        {
          measurement: "phishing",
          tags: {
            user_id: this.author.id,
            guild_id: this.guild.id,
            cluster: this.client.manager.id.toString(),
            shard: this.guild.shardId.toString(),
          },
          fields: {
            guild: `${this.guild?.name} (${this.guild?.id})`,
            user: `${this.author} (${this.author.id})`,
            match,
            content: this.content,
            embeds: embedsHaste?.url,
            embeds_raw: embedsHaste?.raw,
            links: linkHaste?.url,
            links_raw: linkHaste?.raw,
          },
        },
      ]);
      if (process.env.NODE_ENV == "development")
        return await this.reply("triggered steam/nitro phishing detection");
      return await this.member
        ?.bean(
          match ? `Phishing Links (Triggered by ${match})` : "Phishing links",
          this.guild.me,
          null,
          7,
          this.guild?.hasExperiment(936071411, 1)
            ? (this.channel as FireTextChannel)
            : undefined
        )
        .then((result) => {
          if (
            result instanceof FireMessage &&
            result.guild?.me
              ?.permissionsIn(this.channel as FireTextChannel)
              ?.has("ADD_REACTIONS")
          )
            result.react("🎣").catch(() => {});
        });
    };
    if (
      lowerContent.includes("@everyone") &&
      (lowerContent.includes("nitro") ||
        lowerContent.includes("cs:go") ||
        lowerContent.includes("tradeoffer") ||
        lowerContent.includes("partner"))
    )
      return await triggerFilter("Common Words");
    else if (
      lowerContent.includes("steam") &&
      lowerContent.includes("http") &&
      (lowerContent.includes("tradeoffer") ||
        lowerContent.includes("partner") ||
        lowerContent.includes("cs:go"))
    )
      return await triggerFilter("CS:GO Trade/Partner Link");
    else if (
      lowerContent.includes("nitro") &&
      lowerContent.includes("steam") &&
      lowerContent.includes("http")
    )
      return await triggerFilter("Nitro/Steam Link");
    else if (
      lowerContent.includes("nitro") &&
      lowerContent.includes("distributiоn") &&
      lowerContent.includes("free")
    )
      return await triggerFilter("Free Nitro Link");
    else if (
      lowerContent.includes("discord") &&
      lowerContent.includes("steam") &&
      lowerContent.includes("http")
    )
      return await triggerFilter("Discord/Steam Link");
    else if (
      lowerContent.includes("cs") &&
      lowerContent.includes("go") &&
      lowerContent.includes("skin") &&
      lowerContent.includes("http")
    )
      return await triggerFilter("CS:GO Skin");
    else if (
      lowerContent.includes("nitro") &&
      lowerContent.includes("gift") &&
      lowerContent.includes(".ru")
    )
      return await triggerFilter(".ru Nitro Gift Link");
    else if (
      lowerContent.includes("leaving") &&
      lowerContent.includes("fucking") &&
      lowerContent.includes("game")
    )
      return await triggerFilter('"Rage Quit"');
    else if (
      lowerContent.includes("gift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("@everyone")
    )
      return await triggerFilter("@everyone Mention w/Gift Link");
    else if (
      lowerContent.includes("gift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("bro")
    )
      // copilot generated this and I can't stop laughing at it
      return await triggerFilter("Bro Mention w/Gift Link");
    else if (
      lowerContent.includes("gift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("for you")
    )
      return await triggerFilter("gift 4 you bro");
    else if (lowerContent.includes("airdrop") && lowerContent.includes("nitro"))
      return await triggerFilter("Nitro Airdrop");
    else if (lowerContent.includes("/n@") && lowerContent.includes("nitro"))
      return await triggerFilter("Epic Newline Fail");
    else if (
      lowerContent.includes("distribution") &&
      lowerContent.includes("nitro") &&
      lowerContent.includes("steam")
    )
      return await triggerFilter("Nitro/Steam Link");
    else if (
      lowerContent.includes("dis") &&
      lowerContent.includes(".gift") &&
      !lowerContent.includes("discord.gift/")
    )
      return await triggerFilter("Fake gift link");
    else if (
      lowerContent.includes("dis") &&
      lowerContent.includes(".gift") &&
      lowerContent.includes("who is")
    )
      return await triggerFilter("Fake gift link");
  }
}

// @ts-ignore (why this is needed? no clue)
Structures.extend("Message", () => FireMessage);
