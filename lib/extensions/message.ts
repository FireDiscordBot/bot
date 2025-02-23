import sanitizer from "@aero/sanitizer";
import { Fire } from "@fire/lib/Fire";
import { PartialQuoteDestination } from "@fire/lib/interfaces/messages";
import { CommandUtil } from "@fire/lib/util/commandutil";
import { constants, i18nOptions } from "@fire/lib/util/constants";
import Filters from "@fire/src/modules/filters";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  Channel,
  Collection,
  DMChannel,
  DiscordAPIError,
  EmojiIdentifierResolvable,
  GuildChannel,
  GuildTextBasedChannel,
  Message,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  MessageEmbed,
  MessagePayload,
  MessageReaction,
  MessageSelectMenu,
  NewsChannel,
  ReplyMessageOptions,
  Structures,
  ThreadChannel,
  Webhook,
  WebhookClient,
} from "discord.js";
import { RawMessageData } from "discord.js/typings/rawDataTypes";
import Semaphore from "semaphore-async-await";
import { BaseFakeChannel } from "../interfaces/misc";
import { LanguageKeys } from "../util/language";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";

const { regexes, imageExts, audioExts, videoExts } = constants;

export class FireMessage extends Message {
  declare channel: DMChannel | FireTextChannel | NewsChannel | ThreadChannel;
  invWtfResolved: Collection<string, { invite?: string; url?: string }>;
  savedQuoteData: { nsfw: boolean; name: string };
  declare member: FireMember;
  savedToQuoteBy: Snowflake;
  declare guild: FireGuild;
  declare author: FireUser;
  isSavedToQuote: boolean;
  quoteSavedAt?: number;
  declare client: Fire;
  deleteReason: string;
  starLock: Semaphore;
  selfDelete: boolean;
  util?: CommandUtil;
  sentUpsell = false;
  silent?: boolean;

  constructor(client: Fire, data: RawMessageData) {
    super(client, data);
    this.silent = false;
    this.isSavedToQuote = false;
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

  get shard() {
    if (this.guild) return this.guild.shard;
    else if (this.guildId) {
      const shard = this.client.util.getShard(this.guildId);
      if (this.client.ws.shards.has(shard))
        return this.client.ws.shards.get(shard);
      else return this.client.ws.shards.first();
    } else if (
      this.channel instanceof DMChannel &&
      this.client.ws.shards.has(0)
    )
      return this.client.ws.shards.get(0);
    else return this.client.ws.shards.first();
  }

  get source() {
    return this.guild
      ? `${this.guild} (${this.guild.id})`
      : this.guildId
      ? "User App"
      : this.channel.type == "DM"
      ? "DM"
      : "Unknown";
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

            const member = this.channel.guild.members.cache.get(
              id
            ) as FireMember;
            if (member) {
              return `@${member.globalName}`;
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

  async getSystemContent() {
    const lang = this.guild.language ?? this.language;
    const user =
      this.member?.nickname ?? this.author?.globalName ?? this.author?.username;
    if (this.type == "GUILD_MEMBER_JOIN")
      return lang.get(
        `QUOTE_SYSTSEM_MESSAGE_JOIN.JOIN_MESSAGE_${
          this.createdTimestamp % 13
        }` as LanguageKeys,
        { member: user }
      );
    else if (this.type == "CHANNEL_FOLLOW_ADD")
      return lang.get("QUOTE_SYSTEM_MESSAGE_FOLLOW_ADD", {
        user,
        channel: this.content,
      });
    else if (this.type == "CHANNEL_NAME_CHANGE")
      return lang.get("QUOTE_SYSTEM_MESSAGE_CHANNEL_RENAME", {
        user,
        name: this.content,
      });
    else if (this.type == "CHANNEL_PINNED_MESSAGE" && this.reference?.messageId)
      return lang.get("QUOTE_SYSTEM_MESSAGE_PINNED", {
        user,
        link: `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.reference?.messageId}`,
      });
    else if (this.type == "CHANNEL_PINNED_MESSAGE")
      return lang.get("QUOTE_SYSTEM_MESSAGE_PINNED_NO_LINK", {
        user,
      });
    else if (this.type == "GUILD_DISCOVERY_DISQUALIFIED")
      return lang.get("QUOTE_SYSTEM_MESSAGE_DISCOVERY_DISQUALIFIED");
    else if (this.type == "GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING")
      return lang.get("QUOTE_SYSTEM_MESSAGE_DISCOVERY_FINAL_WARN");
    else if (this.type == "GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING")
      return lang.get("QUOTE_SYSTEM_MESSAGE_DISCOVERY_INITIAL_WARN");
    else if (this.type == "GUILD_DISCOVERY_REQUALIFIED")
      return lang.get("QUOTE_SYSTEM_MESSAGE_DISCOVERY_REQUALIFIED");
    else if (this.type == "RECIPIENT_ADD") {
      let member: FireMember;
      const mentioned = this.mentions.users.first() as FireUser;
      if (mentioned) {
        member = (await this.guild.members
          .fetch(mentioned)
          .catch(() => {})) as FireMember;
        return lang.get("QUOTE_SYSTEM_MESSAGE_RECIPIENT_ADD", {
          author: user,
          user: member?.display ?? mentioned?.display,
        });
      } else {
        return lang.get("QUOTE_SYSTEM_MESSAGE_RECIPIENT_ADD_NO_USER", {
          author: user,
        });
      }
    } else if (this.type == "RECIPIENT_REMOVE") {
      let member: FireMember;
      const mentioned = this.mentions.users.first() as FireUser;
      if (mentioned) {
        member = (await this.guild.members
          .fetch(mentioned)
          .catch(() => {})) as FireMember;
        return lang.get("QUOTE_SYSTEM_MESSAGE_RECIPIENT_REMOVE", {
          author: user,
          user: member?.display ?? mentioned?.display,
        });
      } else {
        return lang.get("QUOTE_SYSTEM_MESSAGE_RECIPIENT_REMOVE_NO_USER", {
          author: user,
        });
      }
    } else if (this.type == "THREAD_CREATED" && this.thread)
      return lang.get("QUOTE_SYSTEM_MESSAGE_THREAD_CREATED", {
        user,
        name: this.thread.name,
        link: `https://discord.com/channels/${this.guildId}/${this.thread.id}`,
      });
    else if (this.type == "THREAD_CREATED")
      return lang.get("QUOTE_SYSTEM_MESSAGE_THREAD_CREATED_NO_LINK", {
        user,
        name: this.content,
      });
    else if (this.type == "USER_PREMIUM_GUILD_SUBSCRIPTION")
      return lang.get(
        this.content
          ? "QUOTE_SYSTEM_MESSAGE_BOOST_MULTIPLE"
          : "QUOTE_SYSTEM_MESSAGE_BOOST_ONCE",
        {
          user,
          amount: this.content,
        }
      );
    else if (this.type.startsWith("USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_")) {
      const tier = this.type.split("_").pop();
      return lang.get(
        this.content
          ? "QUOTE_SYSTEM_MESSAGE_BOOST_TIER_MULTIPLE"
          : "QUOTE_SYSTEM_MESSAGE_BOOST_TIER_ONCE",
        {
          user,
          tier,
          amount: this.content,
          guild: this.guild.name,
        }
      );
    }

    // if we get down here, just return the regular content because it's probably an unknown type
    return this.content;
  }

  async send(key: LanguageKeys, args?: i18nOptions) {
    if (!this.channel) return;
    let upsell: MessageEmbed | false;
    if (args?.includeSlashUpsell)
      upsell = await this.client.util.getSlashUpsellEmbed(this);
    return this.channel.send({
      content: this.language.get(key, args),
      allowedMentions: args?.allowedMentions,
      components: args?.components,
      reply: args?.reply,
      embeds: upsell ? [upsell] : undefined,
    });
  }

  async reply(options: string | MessagePayload | ReplyMessageOptions) {
    if (
      !this.channel ||
      this.deleted ||
      (this.guild &&
        !this.guild.members.me?.permissions.has(
          PermissionFlagsBits.ViewChannel |
            PermissionFlagsBits.ReadMessageHistory |
            PermissionFlagsBits.SendMessages
        ))
    )
      return this; // we need to return a message to prevent issues so just return this
    return (await super.reply(options)) as FireMessage;
  }

  async success(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<MessageReaction | Message | void> {
    if (!this.channel) return;
    let upsell: MessageEmbed | false;
    if (args?.includeSlashUpsell)
      upsell = await this.client.util.getSlashUpsellEmbed(this);
    return !key
      ? this.react(this.client.util.useEmoji("success")).catch(() => {})
      : this.channel.send({
          content: this.language.getSuccess(key, args),
          allowedMentions: args?.allowedMentions,
          components: args?.components,
          reply: args?.reply,
          embeds: upsell ? [upsell] : undefined,
        });
  }

  async warn(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<MessageReaction | Message | void> {
    if (!this.channel) return;
    let upsell: MessageEmbed | false;
    if (args?.includeSlashUpsell)
      upsell = await this.client.util.getSlashUpsellEmbed(this);
    return !key
      ? this.react(this.client.util.useEmoji("warning")).catch(() => {})
      : this.reply({
          content: this.language.getWarning(key, args),
          allowedMentions: args?.allowedMentions,
          components: args?.components,
          failIfNotExists: false,
          embeds: upsell ? [upsell] : undefined,
        });
  }

  async error(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<MessageReaction | Message | void> {
    if (!this.channel) return;
    let upsell: MessageEmbed | false;
    if (args?.includeSlashUpsell)
      upsell = await this.client.util.getSlashUpsellEmbed(this);
    return !key
      ? this.react(this.client.util.useEmoji("error")).catch(() => {})
      : this.reply({
          content: this.language.getError(key, args),
          allowedMentions: args?.allowedMentions,
          components: args?.components,
          failIfNotExists: false,
          embeds: upsell ? [upsell] : undefined,
        });
  }

  async react(emoji: EmojiIdentifierResolvable) {
    if (
      (this.channel instanceof ThreadChannel && this.channel.archived) ||
      !this.channel
    )
      return;
    if (process.env.USE_LITECORD == "true")
      return await super.react(emoji).catch(() => this.reactions.cache.first());
    return await super.react(emoji);
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

  async delete(options?: { timeout?: number; reason?: string }) {
    if (options?.timeout) await this.client.util.sleep(options.timeout);
    // e.g. if deleted before timeout finishes
    // (which is the reason why timeout was removed)
    // https://github.com/discordjs/discord.js/pull/4999
    if (this.deleted) return this;
    return (await super.delete().then((m: FireMessage) => {
      m.selfDelete = true;
      if (options?.reason) m.deleteReason = options.reason;
      return m;
    })) as FireMessage;
  }

  async quote(
    destination: GuildTextBasedChannel | PartialQuoteDestination,
    quoter: FireMember | FireUser,
    webhook?: WebhookClient,
    debug?: string[]
  ) {
    // check for quoteable content first
    if (
      !this.content &&
      !this.embeds.length &&
      !this.attachments.size &&
      !this.components.filter((c) => c instanceof MessageActionRow).length &&
      !(await this.getSystemContent())
    )
      return "empty";

    let thread: ThreadChannel;
    if (destination instanceof ThreadChannel) {
      // we can't assign thread to destination since we're reassigning it
      thread = this.client.channels.cache.get(destination.id) as ThreadChannel;
      destination = destination.parent as FireTextChannel;
    }

    // Saved quotes will bypass most of this method as we don't need permission checks
    // as you can only save a message you can see
    if (this.isSavedToQuote) {
      if (debug) debug.push("Saved quote, taking alternate route");
      if (this.author.system && !quoter.isSuperuser()) {
        if (debug) debug.push("Cannot quote a system message");
        return "system";
      }
      if (this.savedQuoteData.nsfw && !destination.nsfw) return "nsfw";

      const canUseAttachmentsInWebhook =
        !this.attachments.size ||
        this.attachments.filter((attachment) => attachment.size > 10485760)
          .size == 0 ||
        !this.content;
      const useWebhooks = webhook
        ? true
        : (typeof destination.fetchWebhooks == "function" &&
          typeof destination.createWebhook == "function" &&
          destination.guild
            ? "permissions" in destination
              ? true // PartialQuoteDestination will always allow webhooks currently
              : destination
                  .permissionsFor(destination.guild.members.me)
                  .has(PermissionFlagsBits.ManageWebhooks)
            : false) && canUseAttachmentsInWebhook;

      return useWebhooks
        ? await this.webhookQuote(destination, quoter, webhook, thread, debug)
        : await this.embedQuote(thread ?? destination, quoter, debug);
    } else if (this.channel.type == "DM") {
      if (debug) debug.push("Message is in DMs");
      return "dm";
    }

    if (quoter instanceof FireUser && destination.guild) {
      if (debug)
        debug.push(
          "Quoter is FireUser and message was not saved, can't continue with permission checks"
        );
      return "permissions";
    }

    const channel =
      this.channel instanceof ThreadChannel
        ? this.channel.parent
        : (this.channel as FireTextChannel);
    if (this.author.system && !quoter.isSuperuser()) {
      if (debug) debug.push("Cannot quote a system message");
      return "system";
    }
    if (channel.nsfw && !destination?.nsfw) return "nsfw";
    const isLurkable =
      this.guild.roles.everyone
        .permissionsIn(channel)
        .has(PermissionFlagsBits.ViewChannel) &&
      this.guild.roles.everyone
        .permissionsIn(channel)
        .has(PermissionFlagsBits.ReadMessageHistory);
    if (debug) debug.push(`Is lurkable: ${isLurkable}`);
    let member: FireMember;
    if (this.guild.id == destination?.guild?.id && quoter instanceof FireMember)
      member = quoter;
    if (
      !this.guild.features?.includes("DISCOVERABLE") ||
      (this.guild.features?.includes("DISCOVERABLE") && !isLurkable)
    ) {
      if (this.guild.id != destination?.guild?.id) {
        member = (await this.guild.members
          .fetch({ user: quoter, cache: false })
          .catch(() => undefined)) as FireMember;
      } else if (quoter instanceof FireMember) member = quoter;
    }

    if (debug && member)
      debug.push(
        `Member is of type ${member?.constructor.name ?? typeof member}`
      );

    // check thread members if private thread
    if (this.channel.type == "GUILD_PRIVATE_THREAD") {
      const threadMember = await (this.channel as ThreadChannel).members.fetch(
        quoter,
        { cache: false }
      );
      if (
        !threadMember ||
        (threadMember instanceof Collection && !threadMember.has(quoter.id))
      ) {
        if (debug)
          debug.push(
            "Cannot quote a message from a thread you are not a member of"
          );
        return "permissions";
      }
    } else if (
      !this.guild.features?.includes("DISCOVERABLE") ||
      (this.guild.features?.includes("DISCOVERABLE") && !isLurkable)
    )
      if (
        !member ||
        !member.permissionsIn(channel).has(PermissionFlagsBits.ViewChannel)
      ) {
        if (debug)
          debug.push(
            "Cannot quote a message from a non-lurkable channel you do not have access to"
          );
        return "permissions";
      }

    const canUseAttachmentsInWebhook =
      !this.attachments.size ||
      // limit attachment size to 25mb for premium, 10mb for regular
      this.attachments.filter(
        (attachment) => attachment.size > (quoter.premium ? 26214400 : 10485760)
      ).size == 0 ||
      !this.content;
    const useWebhooks = webhook
      ? true
      : (typeof destination.fetchWebhooks == "function" &&
        typeof destination.createWebhook == "function" &&
        destination.guild
          ? "permissions" in destination
            ? true // PartialQuoteDestination will always allow webhooks currently
            : destination
                .permissionsFor(destination.guild.members.me)
                .has(PermissionFlagsBits.ManageWebhooks)
          : false) && canUseAttachmentsInWebhook;

    return useWebhooks
      ? await this.webhookQuote(destination, quoter, webhook, thread, debug)
      : await this.embedQuote(thread ?? destination, quoter, debug);
  }

  private async webhookQuote(
    destination:
      | Exclude<GuildTextBasedChannel, ThreadChannel>
      | PartialQuoteDestination,
    quoter: FireMember | FireUser,
    webhook?: WebhookClient,
    thread?: ThreadChannel,
    debug?: string[],
    usernameOverride?: string
  ) {
    let hook: Webhook | WebhookClient = webhook;
    const filters = this.client.getModule("filters") as Filters;
    const destinationGuild = destination.guild as FireGuild;
    if (destinationGuild && !destinationGuild?.quoteHooks)
      destinationGuild.quoteHooks = new Collection();
    if (!destinationGuild?.quoteHooks.has(destination.id)) {
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
        if (!hook) {
          if (debug)
            debug.push("Failed to create webhook, falling back to embed quote");
          return await this.embedQuote(destination, quoter);
        }
      }
    } else hook = destinationGuild?.quoteHooks.get(destination.id);
    // if hook doesn't exist by now, something went wrong
    // and it's best to just ignore it
    if (!hook) {
      if (debug)
        debug.push("Failed to get webhook or cached webhook is invalid");
      return;
    }
    if (hook instanceof Webhook && hook.channelId != destination.id) {
      destinationGuild?.quoteHooks.delete(destination.id);
      // return to top of method, pass webhook arg as null to try avoid infinite loop
      return await this.webhookQuote(destination, quoter, null, thread, debug);
    }
    destinationGuild?.quoteHooks.set(destination.id, hook);
    let content = this.system ? await this.getSystemContent() : this.content;
    if (content) {
      if (!quoter?.isSuperuser() && !this.system) {
        content = content.replace(regexes.maskedLink, "\\[$1\\]\\($2)");
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
    const ATTACH_FILES = PermissionFlagsBits.AttachFiles,
      EMBED_LINKS = PermissionFlagsBits.EmbedLinks;
    const canAttach =
      destination instanceof GuildChannel && quoter instanceof FireMember
        ? quoter.permissionsIn(destination).has(ATTACH_FILES)
        : (BigInt((destination as PartialQuoteDestination).permissions) &
            ATTACH_FILES) ==
          ATTACH_FILES;
    const canEmbed =
      destination instanceof GuildChannel && quoter instanceof FireMember
        ? quoter.permissionsIn(destination).has(EMBED_LINKS)
        : (BigInt((destination as PartialQuoteDestination).permissions) &
            EMBED_LINKS) ==
          EMBED_LINKS;
    if (!canEmbed && content) content = this.client.util.supressLinks(content);
    if (!content && this.attachments.size && canAttach)
      content = this.attachments.map((a) => a.url).join("\n");
    else if (canAttach && this.attachments.size) {
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
      ((await this.guild?.members
        .fetch(this.author)
        .catch(() => null)) as FireMember);
    let components = this.components;
    if (components.length && this.author.id != this.client?.user?.id)
      for (const [rowIndex, component] of components.entries()) {
        if (component instanceof MessageActionRow)
          for (const [componentIndex, c] of component.components.entries()) {
            if (c instanceof MessageButton && c.style != "LINK")
              c.setCustomId(`quote_copy${rowIndex}${componentIndex}`);
            else if (c instanceof MessageSelectMenu)
              c.setCustomId(`quote_copy${rowIndex}${componentIndex}`);
            if (c instanceof MessageButton && c.style == "LINK")
              if (await filters.isFiltered(c.url, quoter)) c.setURL("");
            component.components = component.components.filter((c) => {
              if (c instanceof MessageButton && c.style == "LINK")
                return !!c.url;
              else return true;
            });
          }
      }
    components = components.filter(
      (c) => c instanceof MessageActionRow && c.components.length
    );
    const isAutomod = this.type == "AUTO_MODERATION_ACTION";
    const automodEmbeds = [];
    if (isAutomod) {
      const automodEmbed = this.embeds?.[0];
      const rule =
        automodEmbed?.fields?.find((f) => f.name == "rule_name")?.value ??
        "Unknown";
      const channelId = automodEmbed?.fields?.find(
        (f) => f.name == "channel_id"
      )?.value;
      let channel: string = "Unknown";
      if (channelId)
        channel = await this.client.channels
          .fetch(channelId, {
            allowUnknownGuild: true,
            cache: false,
          })
          .then((c) =>
            c instanceof GuildChannel
              ? c.guildId ==
                (destination instanceof Channel
                  ? destination.guildId
                  : destination.guild_id)
                ? c.toString()
                : `#${c.name}`
              : "Unknown"
          )
          .catch(() => "Unknown");
      content = this.guild.language.get("QUOTE_AUTOMOD_CONTENT", {
        rule,
        channel,
      });
      const embed = new MessageEmbed()
        .setAuthor({
          name: this.author.toString(),
          iconURL: (member ?? this.author).displayAvatarURL({
            size: 2048,
            format: "png",
          }),
        })
        .setTimestamp(this.createdTimestamp);
      if (automodEmbed.description)
        embed.setDescription(automodEmbed.description);
      automodEmbeds.push(embed);
    }
    const username =
      usernameOverride ||
      (this.system && this.guild && this.reference?.guildId != this.guild.id
        ? this.guild?.name
        : member
        ? member.display.replace(/#0000/gim, "")
        : this.author.display.replace(/#0000/gim, ""));
    return await hook
      .send({
        content: content.length ? content : null,
        username: isAutomod
          ? this.guild.language.get("QUOTE_AUTOMOD_USERNAME", {
              username,
            })
          : username,
        avatarURL: isAutomod
          ? constants.url.automodAvatar
          : this.system && this.guild
          ? this.guild.iconURL({
              size: 2048,
              format: "png",
            })
          : (member ?? this.author).displayAvatarURL({
              size: 2048,
              format: "png",
            }),
        embeds: isAutomod
          ? automodEmbeds
          : this.embeds.filter(
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
        components,
      })
      .catch(async (e: Error) => {
        if (
          e instanceof DiscordAPIError &&
          e.code == 50035 &&
          e.message.includes("Username cannot contain")
        ) {
          usernameOverride = username;
          const blockedUsername = regexes.blockedUsername.exec(e.message)?.[1];
          regexes.blockedUsername.lastIndex = 0;
          if (blockedUsername) {
            while (
              usernameOverride
                .toLowerCase()
                .includes(blockedUsername.toLowerCase())
            ) {
              const usernameIndex = usernameOverride
                .toLowerCase()
                .indexOf(blockedUsername.toLowerCase());
              const matchedUsername = usernameOverride.slice(
                usernameIndex,
                usernameIndex + blockedUsername.length
              );
              if (matchedUsername)
                usernameOverride = usernameOverride.replaceAll(
                  matchedUsername,
                  "[blocked]"
                );
            }
            return await this.webhookQuote(
              destination,
              quoter,
              webhook,
              thread,
              debug,
              usernameOverride
            );
          }
        }
        // this will ensure deleted webhooks are deleted
        // but also allow webhooks to be refreshed
        // even if the cached one still exists
        this.guild?.quoteHooks.delete(destination.id);
        if (debug) debug.push(`Encountered error while sending, ${e.message}`);
        if (debug && quoter.isSuperuser() && e instanceof DiscordAPIError)
          debug.push(`\`\`\`${JSON.stringify(e.requestData.json)}\`\`\``);
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
    destination: GuildTextBasedChannel | PartialQuoteDestination,
    quoter: FireMember | FireUser,
    debug?: string[]
  ) {
    // PartialQuoteDestination needs to be set for type here
    // since this#quote can take either but it should never
    // actually end up at this point
    if (
      !(destination instanceof Channel) &&
      !(destination instanceof ThreadChannel)
    ) {
      if (debug) debug.push("Destination is not a channel or thread");
      return;
    }
    const { language } = (destination.guild as FireGuild) ?? quoter;
    const extraEmbeds: MessageEmbed[] = [];
    if (!this.content && this.author.bot && this.embeds.length) {
      return await destination.send({
        content: language.get("QUOTE_EMBED_FROM", {
          author: this.author.toString(),
          channel: this.isSavedToQuote
            ? this.savedQuoteData.name
            : (this.channel as FireTextChannel).name,
        }),
        embeds: this.embeds,
      });
    } else if (this.author.bot && this.embeds.length)
      extraEmbeds.push(...this.embeds);
    const member =
      this.member ??
      ((await this.guild?.members
        .fetch(this.author)
        .catch(() => null)) as FireMember) ??
      null;
    const embed = new MessageEmbed()
      .setColor(
        member?.displayColor ||
          (quoter instanceof FireMember ? quoter.displayColor : null)
      )
      .setTimestamp(this.createdAt)
      .setAuthor({
        name: member
          ? member.display.replace(/#0000/gim, "")
          : this.author.display.replace(/#0000/gim, ""),
        iconURL: (member ?? this.author).displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      });
    if (this.content) {
      let content = this.system ? await this.getSystemContent() : this.content;
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
    embed.addFields({
      name: language.get("JUMP_URL"),
      value: `[${language.get("CLICK_TO_VIEW")}](${this.url})`,
    });
    const ATTACH_FILES = PermissionFlagsBits.AttachFiles;
    if (
      this.attachments?.size &&
      (quoter instanceof FireMember
        ? quoter
            .permissionsIn(
              destination instanceof BaseFakeChannel
                ? (destination.real as GuildTextBasedChannel)
                : destination
            )
            .has(ATTACH_FILES)
        : (BigInt(
            (destination as unknown as PartialQuoteDestination)?.permissions ||
              "0"
          ) &
            ATTACH_FILES) ==
          ATTACH_FILES)
    ) {
      if (
        this.attachments.size == 1 &&
        imageExts.filter((ext) => this.attachments.first().name.endsWith(ext))
          .length &&
        !embed.image?.url
      )
        embed.setImage(this.attachments.first().url);
      else
        embed.addFields(
          this.attachments.map((attachment) => ({
            name: language.get("ATTACHMENT"),
            value: `[${attachment.name}](${attachment.url})`,
          }))
        );
    }
    if (this.channel != destination) {
      if (this.guild && this.guild.id != destination.guild?.id)
        embed.setFooter({
          text: language.get("QUOTE_EMBED_FOOTER_ALL", {
            user: quoter.toString(),
            channel: this.isSavedToQuote
              ? this.savedQuoteData.name
              : (this.channel as FireTextChannel).name,
            guild: this.guild.name,
          }),
        });
      else
        embed.setFooter({
          text: language.get("QUOTE_EMBED_FOOTER_SOME", {
            user: quoter.toString(),
            channel: this.isSavedToQuote
              ? this.savedQuoteData.name
              : (this.channel as FireTextChannel).name,
          }),
        });
    } else
      embed.setFooter({
        text: language.get("QUOTE_EMBED_FOOTER", { user: quoter.toString() }),
      });
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

    const starEmoji: string = this.guild.settings
      .get("starboard.emoji", "⭐")
      .trim();
    let stars = this.reactions.cache.get(starEmoji)?.count || 0;

    if (stars == 1 && (user.id == this.author.id || user.bot)) stars = 0;

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
      if (action == "add" && user.id != this.author.id && !user.bot)
        cachedStars++;
      else if (action == "remove" && user.id != this.author.id && !user.bot)
        cachedStars--;
      // if this is false, we've (probably) drifted too much so we use the reaction count instead of the cached count
      if (
        (cachedStars > stars && cachedStars - stars >= 8) ||
        (stars > cachedStars && stars - cachedStars >= 8)
      )
        stars = cachedStars;
      // unchanged, don't do anything
      if (stars == this.guild.starboardReactions.get(this.id)) return;
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
      if (stars != this.guild.starboardReactions.get(this.id)) {
        // Someone likely added/removed a reaction which would result in this method being called again
        // so we can return if it doesn't match
        this.starLock.release();
        return;
      }
      setTimeout(() => {
        this.starLock.release();
      }, 3500);
      const [content, embed] = this.getStarboardMessage(
        emoji,
        this.guild.starboardReactions.get(this.id)
      );
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
        name: this.author.display,
        iconURL: (this.member ?? this.author).displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(this.member?.displayColor || "#FFFFFF")
      .setFooter({ text: this.id });
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
        if (
          imageExts.some((ext) => attachment.name.endsWith(ext)) &&
          !embed.image // prevent setting if already set, should always use the first image attachment
        ) {
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
            embed.addFields({
              name: "\u200b",
              value: this.guild.language.get("STARBOARD_CONTAINS_VIDEO"),
            });
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
            embed.addFields({
              name: "\u200b",
              value: this.guild.language.get("STARBOARD_CONTAINS_AUDIO"),
            });
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
      embed.addFields({
        name: "\u200b",
        value: `[${this.guild.language.get("STARBOARD_JUMP_TO")}](${this.url})`,
      });
    return [`${emoji} **${stars}** | ${this.channel}`, embed];
  }

  async runAntiFilters() {
    if (!this.guild || this.author.bot || this.type == "AUTO_MODERATION_ACTION")
      return;
    if (!this.member || this.member.partial)
      await this.guild.members.fetch(this.author.id).catch(() => {});
    if (!this.member) return; // if we still don't have access to member, just ignore

    if (
      this.guild.settings.get<boolean>("mod.antieveryone", false) &&
      (this.content?.includes("@everyone") ||
        this.content?.includes("@here")) &&
      !this.member.permissions.has(PermissionFlagsBits.MentionEveryone)
    )
      return await this.delete({
        reason: this.guild.language.get("ANTI_DELETE_REASON_EVERYONE"),
      }).catch(() => {});

    if (
      this.guild.settings.get<boolean>("mod.antizws", false) &&
      // some emojis use \u200d (e.g. trans flag) so we replace all unicode emoji before checking for zero width characters
      regexes.zws.test(this.content.replace(regexes.unicodeEmoji, "")) &&
      !this.member.isModerator()
    ) {
      regexes.zws.lastIndex = 0;
      return await this.delete({
        reason: this.guild.language.get("ANTI_DELETE_REASON_ZWS"),
      }).catch(() => {});
    }
    regexes.zws.lastIndex = 0;

    if (
      this.guild.settings.get<boolean>("mod.antispoilers", false) &&
      regexes.spoilerAbuse.test(this.content) &&
      !this.member.isModerator()
    ) {
      regexes.spoilerAbuse.lastIndex = 0;
      return await this.delete({
        reason: this.guild.language.get("ANTI_DELETE_REASON_SPOILER"),
      }).catch(() => {});
    }
    regexes.spoilerAbuse.lastIndex = 0;
  }

  async runPhishFilters() {
    if (
      !this.guild ||
      this.author?.bot ||
      this.webhookId ||
      this.author.system ||
      !this.guild?.hasExperiment(936071411, [1, 2])
    )
      return;
    if (
      (this.editedTimestamp &&
        this.editedTimestamp - this.createdTimestamp > 60000) || // ignore edits older than 1 minute
      +new Date() - this.createdTimestamp > 604_800_000 // ignore msgs older than 7 days
    )
      return;
    const lowerContent = sanitizer(
      (this.content + (this.embeds.map((e) => e.description).join(" ") ?? ""))
        .toLowerCase()
        .replace(/\s/gim, "")
        .replace(regexes.zws, "")
    );
    const logPhish = async (match?: string) => {
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
      this.client.manager.writeToInflux([
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
            nonce: this.nonce ?? "none",
          },
        },
      ]);
    };
    const triggerWarning = async () => {
      await logPhish("No Nonce");
      const updatesChannel = this.guild.publicUpdatesChannel;
      if (!updatesChannel) return; // no updates channel, no warning
      const embed = new MessageEmbed()
        .setColor(this.member.displayColor || "#FFFFFF")
        .setAuthor({
          name: this.author.toString(),
          iconURL: (this.member ?? this.author).displayAvatarURL({
            format: "png",
            dynamic: true,
            size: 2048,
          }),
        })
        .setTitle("Suspicious Message")
        .setURL(this.url)
        .setDescription(this.content)
        .addFields({
          name: "Why?",
          value: `This message was sent with no "nonce" which is used for message deduplication by Discord's official clients.
The lack of this is a sign that this message may have been sent automatically by a poorly made script.`,
        })
        .setFooter({ text: this.author.id });
      return await updatesChannel.send({ embeds: [embed] }).catch(() => {});
    };
    const triggerFilter = async (match?: string) => {
      await logPhish(match);
      if (process.env.NODE_ENV == "development")
        return await this.reply("triggered steam/nitro phishing detection");
      if (!this.nonce)
        return await this.member
          ?.bean(
            match ? `Phishing Links (Triggered by ${match})` : "Phishing links",
            this.guild.members.me as FireMember,
            null,
            7,
            this.guild?.hasExperiment(936071411, 1)
              ? (this.channel as FireTextChannel)
              : undefined
          )
          .then((result) => {
            if (
              result instanceof FireMessage &&
              result.guild?.members.me
                ?.permissionsIn(this.channel as FireTextChannel)
                ?.has(PermissionFlagsBits.AddReactions)
            )
              result.react("🎣").catch(() => {});
          });
      else
        return await this.member
          ?.yeet(
            match ? `Phishing Links (Triggered by ${match})` : "Phishing links",
            this.guild.members.me as FireMember,
            this.guild?.hasExperiment(936071411, 1)
              ? (this.channel as FireTextChannel)
              : undefined,
            false
          )
          .then((result) => {
            this.delete({
              reason: match
                ? `Phishing Links (Triggered by ${match})`
                : "Phishing links",
            }).catch(() => {});
            if (
              result instanceof FireMessage &&
              result.guild?.members.me
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
    // else if (
    //   lowerContent.includes("discord") &&
    //   lowerContent.includes("steam") &&
    //   lowerContent.includes("http")
    // )
    //   return await triggerFilter("Discord/Steam Link");
    else if (
      (lowerContent.includes("csgo") || lowerContent.includes("cs:go")) &&
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
    // else if (
    //   lowerContent.includes("leaving") &&
    //   lowerContent.includes("fucking") &&
    //   lowerContent.includes("game")
    // )
    //   return await triggerFilter('"Rage Quit"');
    // else if (
    //   lowerContent.includes("gift") &&
    //   lowerContent.includes("http") &&
    //   lowerContent.includes("@everyone")
    // )
    //   return await triggerFilter("@everyone Mention w/Gift Link");
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
      lowerContent.includes("foryou")
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
      !lowerContent.includes("discord.gift")
    )
      return await triggerFilter("Fake gift link");
    else if (
      lowerContent.includes("dis") &&
      lowerContent.includes(".gift") &&
      lowerContent.includes("who is")
    )
      return await triggerFilter("Fake gift link");
    else if (
      lowerContent.includes("steamgift50$") &&
      ((lowerContent.includes("[steam") && lowerContent.includes("http")) ||
        (lowerContent.includes("[http") && lowerContent.includes("steam")))
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$fromsteam") &&
      ((lowerContent.includes("[steam") && lowerContent.includes("http")) ||
        (lowerContent.includes("[http") && lowerContent.includes("steam")))
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$gift") &&
      ((lowerContent.includes("[steam") && lowerContent.includes("http")) ||
        (lowerContent.includes("[http") && lowerContent.includes("steam")))
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("freegift") &&
      ((lowerContent.includes("[steam") && lowerContent.includes("http")) ||
        (lowerContent.includes("[http") && lowerContent.includes("steam")))
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("steamwintergiveaway") &&
      ((lowerContent.includes("[steam") && lowerContent.includes("http")) ||
        (lowerContent.includes("[http") && lowerContent.includes("steam")))
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$gift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("ste")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$gift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("steam") &&
      lowerContent.includes("winter")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$gift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("steam") &&
      lowerContent.includes("ticket")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$steamgift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("activation")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$steamgift") &&
      lowerContent.includes("http") &&
      lowerContent.includes(".to")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("$steamgift") &&
      lowerContent.includes("http") &&
      lowerContent.includes("comm")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("steamgivesapersonalgift-") &&
      lowerContent.includes("http") &&
      lowerContent.includes("steam")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("giftfromsteam") &&
      lowerContent.includes("http") &&
      lowerContent.includes("steam")
    )
      return await triggerFilter("Fake steam gift link");
    else if (
      lowerContent.includes("steamgift") &&
      lowerContent.includes("$-steamcommunity.com")
    )
      // this isn't even phishing
      // idk what the point is
      // but it's spam & almost certainly a compromised account
      // so we yeet 'em anyways so they can't try any actual phishing
      return await triggerFilter(
        "Real steam link that just redirects to the homepage for some reason ?????????"
      );
    // else if (
    //   lowerContent.includes("test") &&
    //   lowerContent.includes("game") &&
    //   !lowerContent.includes("http") &&
    //   lowerContent.includes("password")
    // )
    //   return await triggerFilter("Try my game scam");
    // else if (
    //   lowerContent.includes("bro") &&
    //   lowerContent.includes("game") &&
    //   lowerContent.includes("test")
    // )
    //   return await triggerFilter("Try my game scam");
    // else if (
    //   lowerContent.includes("game") &&
    //   lowerContent.includes("test") &&
    //   lowerContent.includes(".rar")
    // )
    //   return await triggerFilter("Try my game scam");
    // else if (
    //   lowerContent.includes("game") &&
    //   lowerContent.includes("test") &&
    //   lowerContent.includes(".exe")
    // )
    //   return await triggerFilter("Try my game scam");
    // always keep this last
    else if (
      lowerContent.includes("http") &&
      !this.nonce &&
      this.type != "AUTO_MODERATION_ACTION"
    )
      return await triggerWarning();
  }
}

// @ts-ignore (why this is needed? no clue)
Structures.extend("Message", () => FireMessage);
