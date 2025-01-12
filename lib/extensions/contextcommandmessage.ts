import { Fire } from "@fire/lib/Fire";
import {
  ArgumentOptions,
  Command,
  InvalidArgumentContextError,
} from "@fire/lib/util/command";
import { CommandUtil } from "@fire/lib/util/commandutil";
import { i18nOptions } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  AwaitMessagesOptions,
  Collection,
  CreateInviteOptions,
  DMChannel,
  DeconstructedSnowflake,
  EmojiIdentifierResolvable,
  GuildChannel,
  GuildMemberResolvable,
  MessageAttachment,
  MessageMentions,
  MessagePayload,
  MessageReaction,
  MessageResolvable,
  MessageType,
  NewsChannel,
  Permissions,
  ReactionManager,
  RoleResolvable,
  SnowflakeUtil,
  ThreadChannel,
  WebhookMessageOptions,
} from "discord.js";
import { RawMessageData, RawUserData } from "discord.js/typings/rawDataTypes";
import Semaphore from "semaphore-async-await";
import { BaseFakeChannel } from "../interfaces/misc";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { MessageContextMenuInteraction } from "./messagecontextmenuinteraction";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";
import { UserContextMenuInteraction } from "./usercontextmenuinteraction";

const PLACEHOLDER_ID = "0".repeat(15);

export class ContextCommandMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  attachments: Collection<string, MessageAttachment>;
  private snowflake: DeconstructedSnowflake;
  contextCommand: MessageContextMenuInteraction | UserContextMenuInteraction;
  getLatestResponseLock: Semaphore;
  sent: false | "ack" | "message";
  type: MessageType = "DEFAULT";
  latestResponseId: Snowflake;
  latestResponse: FireMessage;
  mentions: MessageMentions;
  private _flags: number;
  content: string = "";
  channel: FakeChannel;
  deleteReason: string;
  member?: FireMember;
  language: Language;
  guild?: FireGuild;
  util: CommandUtil;
  command: Command;
  author: FireUser;
  deleted = false;
  id: Snowflake;
  client: Fire;

  constructor(
    client: Fire,
    command: MessageContextMenuInteraction | UserContextMenuInteraction
  ) {
    this.client = client;
    this.id = command.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.getLatestResponseLock = new Semaphore(1);
    this.contextCommand = command;
    this.guild = client.guilds.cache.get(command.guildId) as FireGuild;
    this.command = this.client.getContextCommand(command);
    this._flags = 0;
    if (this.command?.ephemeral) this.flags = 64;
    // @ts-ignore
    this.mentions = new MessageMentions(this, [], [], false);
    this.attachments = new Collection();
    // @mason pls just always include user ty
    const user = command.user ?? command.member?.user;
    this.author =
      (client.users.cache.get(user.id) as FireUser) ||
      new FireUser(client, user as RawUserData);
    if (this.guild) {
      this.member =
        (this.guild.members.cache.get(this.author.id) as FireMember) ||
        new FireMember(client, command.member, this.guild);
    }
    this.language =
      (this.author?.settings.has("utils.language")
        ? this.author.language.id == "en-US" &&
          this.guild?.language.id != "en-US"
          ? this.guild?.language
          : this.author.language
        : this.guild?.language) ?? client.getLanguage("en-US");
    this.realChannel = this.client.channels.cache.get(
      this.contextCommand.channelId
    ) as FireTextChannel | NewsChannel | DMChannel;
    this.latestResponseId = "@original" as Snowflake;
    this.sent = false;
    this.util = new CommandUtil(this.client.commandHandler, this);
    if (!this.guild) {
      // This will happen if a guild authorizes w/applications.commands only
      // or if a slash command is invoked in DMs (discord/discord-api-docs #2568)
      this.channel = new FakeChannel(
        this,
        client,
        command.id,
        command.token,
        command.guildId ? undefined : this.author.dmChannel
      );
      return this;
    }
    this.channel = new FakeChannel(
      this,
      client,
      command.id,
      command.token,
      this.realChannel
    );
  }

  set flags(flags: number) {
    // Suppress and ephemeral
    if (![1 << 2, 1 << 6].includes(flags) && flags != 0) return;
    this._flags = flags;
  }

  get flags() {
    return this._flags;
  }

  get shard() {
    if (this.guild) return this.guild.shard;
    else if (this.guildId) {
      const shard = this.client.util.getShard(this.guildId);
      if (this.client.ws.shards.has(shard))
        return this.client.ws.shards.get(shard);
      else return this.client.ws.shards.first();
    } else if (
      this.channel.real instanceof DMChannel &&
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

  get editedAt() {
    if (this.latestResponse && this.latestResponse instanceof FireMessage)
      return this.latestResponse.editedAt;
    return null;
  }

  get editedTimestamp() {
    if (this.latestResponse && this.latestResponse instanceof FireMessage)
      return this.latestResponse.editedTimestamp;
    return 0;
  }

  get createdAt() {
    if (this.latestResponse && this.latestResponse instanceof FireMessage)
      return this.latestResponse.createdAt;
    return this.snowflake.date;
  }

  get createdTimestamp() {
    if (this.latestResponse && this.latestResponse instanceof FireMessage)
      return this.latestResponse.createdTimestamp;
    return this.snowflake.timestamp;
  }

  get url() {
    if (this.latestResponse)
      return `https://discord.com/channels/${
        this.guild ? this.guild.id : "@me"
      }/${this.realChannel?.id || PLACEHOLDER_ID}/${this.latestResponse.id}`;
    else
      return `https://discord.com/channels/${
        this.guild ? this.guild.id : "@me"
      }/${this.realChannel?.id || PLACEHOLDER_ID}/${this.id}`;
  }

  get guildId() {
    return this.contextCommand.guildId;
  }

  get channelId() {
    return this.contextCommand.channelId;
  }

  get applicationId() {
    return this.contextCommand.applicationId;
  }

  get webhookId() {
    return null;
  }

  getMessage(required = false) {
    const message = this.contextCommand.options.getMessage("message", required);
    if (message instanceof FireMessage) return message;
    else if (typeof message == "object" && message?.id)
      return new FireMessage(this.client, message as RawMessageData);
  }

  getUser(required = false) {
    return this.contextCommand.options.getUser("user", required) as FireUser;
  }

  getMember(required = false) {
    if (!this.guild && !required) return null;
    else if (!this.guild) throw new InvalidArgumentContextError("member");
    return this.contextCommand.options.getMember(
      "user",
      required
    ) as FireMember;
  }

  getMemberOrUser(required = false) {
    if (!this.guild) return this.getUser(required);
    return this.getMember(false) ?? this.getUser(required);
  }

  get cleanContent() {
    return this.language.get("USER_USED_CONTEXT_COMMAND", {
      user: this.author.toString(),
      cmd: this.contextCommand.commandName,
    });
  }

  get crosspostable() {
    return false;
  }

  get deletable() {
    if (!this.guild) {
      return this.author.id === this.client.user.id;
    }

    const permissions = this.channel?.permissionsFor(this.client.user);
    if (!permissions) return false;
    // This flag allows deleting even if timed out
    if (permissions.has(PermissionFlagsBits.Administrator, false)) return true;

    return Boolean(
      this.author.id === this.client.user.id ||
        (permissions.has(PermissionFlagsBits.ManageMessages, false) &&
          this.guild.members.me.communicationDisabledUntilTimestamp <
            Date.now())
    );
  }

  get selfDelete() {
    return this.deleted;
  }

  get editable() {
    return true;
  }

  get hasThread() {
    return this.latestResponse?.hasThread ?? false;
  }

  get thread() {
    return this.realChannel instanceof NewsChannel ||
      this.realChannel instanceof FireTextChannel
      ? this.realChannel.threads.cache.get(this.latestResponse.id)
      : null;
  }

  get interaction() {
    return {
      id: this.id,
      type: "APPLICATION_COMMAND",
      commandName: this.command.id,
      user: this.author,
    };
  }

  get partial() {
    return this.latestResponse?.partial ?? true;
  }

  get pinnable() {
    return true;
  }

  get pinned() {
    return this.latestResponse?.pinned ?? false;
  }

  get system() {
    return false;
  }

  get reactions() {
    return (
      this.latestResponse?.reactions ??
      new ReactionManager(this as unknown as FireMessage)
    );
  }

  get stickers() {
    return this.latestResponse?.stickers ?? new Collection();
  }

  get tts() {
    return false;
  }

  get reference() {
    return null;
  }

  get invWtfResolved() {
    return new Collection();
  }

  get embeds() {
    return this.latestResponse?.embeds ?? [];
  }

  get nonce() {
    return "deez nuts";
  }

  // this is horribly hacky just like slash commands but will eventually be replaced
  async generateContent() {
    let content = `/${this.command.id} `;
    if (this.command.args?.length && this.contextCommand.options?.data.length) {
      const commandArgs = this.command.args as ArgumentOptions[];
      const argNames = this.contextCommand.options.data.map((opt) => opt.name);
      const sortedArgs = Object.values(this.contextCommand.options.data).sort(
        (a, b) =>
          argNames.indexOf(a.name.toLowerCase()) -
          argNames.indexOf(b.name.toLowerCase())
      );
      let args = sortedArgs.map((opt) => {
        if (
          commandArgs.find(
            (arg) => arg.id == opt.name && arg.flag && arg.match == "flag"
          ) &&
          opt.value
        ) {
          const arg = commandArgs.find((arg) => arg.id == opt.name);
          return arg.flag;
        } else if (commandArgs.find((arg) => arg.id == opt.name && arg.flag)) {
          const arg = commandArgs.find((arg) => arg.id == opt.name && arg.flag);
          if (arg.match == "flag" && opt.value) return `--${opt.name}`;
          else if (arg.match == "flag") return "";
          else return `--${opt.name} ${opt.value}`;
        }
        return opt.value;
      });
      content += args.join(" ").trim();
    }
    this.content = content;
    return this.content;
  }

  send(key: LanguageKeys, args?: i18nOptions) {
    return this.channel.send(
      {
        content: this.language.get(key, args),
        allowedMentions: args?.allowedMentions,
        components: args?.components,
      },
      this.flags
    );
  }

  success(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ContextCommandMessage | MessageReaction | void> {
    if (!key) {
      if (this.latestResponse instanceof FireMessage)
        return this.latestResponse
          .react(this.client.util.useEmoji("success"))
          .catch(() => {});
      else
        return this.getLatestResponse().then((message) => {
          if (!message || !(message instanceof FireMessage))
            return this.success("SLASH_COMMAND_HANDLE_SUCCESS");
          message.react(this.client.util.useEmoji("success")).catch(() => {
            return this.success("SLASH_COMMAND_HANDLE_SUCCESS");
          });
        });
    }
    return this.channel.send(
      {
        content: this.language.getSuccess(key, args),
        allowedMentions: args?.allowedMentions,
        components: args?.components,
      },
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  warn(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ContextCommandMessage | MessageReaction | void> {
    if (!key) {
      if (this.latestResponse instanceof FireMessage)
        return this.latestResponse
          .react(this.client.util.useEmoji("warning"))
          .catch(() => {});
      else
        return this.getLatestResponse().then((message) => {
          if (!message || !(message instanceof FireMessage))
            return this.warn("SLASH_COMMAND_HANDLE_FAIL");
          message.react(this.client.util.useEmoji("warning")).catch(() => {
            return this.warn("SLASH_COMMAND_HANDLE_FAIL");
          });
        });
    }
    return this.channel.send(
      {
        content: this.language.getWarning(key, args),
        allowedMentions: args?.allowedMentions,
        components: args?.components,
      },
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  error(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ContextCommandMessage | MessageReaction | void> {
    if (!key) {
      if (this.latestResponse instanceof FireMessage)
        return this.latestResponse
          .react(this.client.util.useEmoji("error"))
          .catch(() => {});
      else
        return this.getLatestResponse().then((message) => {
          if (!message || !(message instanceof FireMessage))
            return this.error("SLASH_COMMAND_HANDLE_FAIL");
          message.react(this.client.util.useEmoji("error")).catch(() => {
            return this.error("SLASH_COMMAND_HANDLE_FAIL");
          });
        });
    }
    return this.channel.send(
      {
        content: this.language.getSlashError(key, args),
        allowedMentions: args?.allowedMentions,
        components: args?.components,
      },
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  async getLatestResponse() {
    await this.getLatestResponseLock.acquire();
    if (this.latestResponse instanceof FireMessage) {
      this.getLatestResponseLock.release();
      return this.latestResponse;
    }

    const message = (await this.client.req
      .webhooks(this.client.user.id, this.contextCommand.token)
      .messages(this.latestResponse)
      .get()) as RawMessageData;
    if (message && message.id)
      this.latestResponse = new FireMessage(this.client, message);
    this.getLatestResponseLock.release();
    return this.latestResponse;
  }

  async getResponse(messageId: Snowflake) {
    const message = (await this.client.req
      .webhooks(this.client.user.id, this.contextCommand.token)
      .messages(messageId)
      .get()) as RawMessageData;
    if (message && message.id) return new FireMessage(this.client, message);
  }

  async edit(
    options?:
      | string
      | MessagePayload
      | (WebhookMessageOptions & { split?: false })
  ) {
    let apiMessage: MessagePayload;

    if (options instanceof MessagePayload) apiMessage = options.resolveData();
    else {
      apiMessage = MessagePayload.create(
        this.contextCommand,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    await this.client.req
      .webhooks(this.client.user.id, this.contextCommand.token)
      .messages(this.latestResponseId)
      .patch({
        data,
        files,
      })
      .catch(() => {});
    return this;
  }

  async delete(options?: { timeout: number; reason?: string }) {
    if (!this.deletable) return this;
    if (options?.timeout) await this.client.util.sleep(options.timeout);
    // e.g. if deleted before timeout finishes
    // (which is the reason why timeout was removed)
    // https://github.com/discordjs/discord.js/pull/4999
    if (this.deleted) return this;
    return await this.client.req
      .webhooks(this.client.user.id, this.contextCommand.token)
      .messages(this.latestResponseId)
      .delete()
      .then((m: ContextCommandMessage) => {
        if (options?.reason) m.deleteReason = options.reason;
        return m;
      })
      .catch(() => {});
  }

  async react(emoji: EmojiIdentifierResolvable) {
    await this.getLatestResponse();
    if (!this.latestResponse || typeof this.latestResponse.react != "function")
      return;

    return await this.latestResponse.react(emoji);
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
}

export class FakeChannel extends BaseFakeChannel {
  declare message: ContextCommandMessage;
  ackLock = new Semaphore(1);

  constructor(
    message: ContextCommandMessage,
    client: Fire,
    id: Snowflake,
    token: string,
    real?: FireTextChannel | NewsChannel | DMChannel
  ) {
    super();
    this.real = real;
    this.token = token;
    this.client = client;
    this.message = message;
    this.id = this.real?.id;
    this.interactionId = id;

    if (!(real instanceof DMChannel) && real?.guild)
      this.guild = real.guild as FireGuild;
    else if (this.message.guild) this.guild = this.message.guild;
  }

  get name() {
    return this.real instanceof DMChannel
      ? this.real.recipient.toString()
      : this.real?.name;
  }

  get flags() {
    return this.message.flags;
  }

  get permissionOverwrites() {
    return this.real instanceof GuildChannel
      ? this.real.permissionOverwrites
      : undefined;
  }

  get messages() {
    return this.real.messages;
  }

  toString() {
    return this.real?.toString();
  }

  permissionsFor(memberOrRole: GuildMemberResolvable | RoleResolvable) {
    return this.real instanceof DMChannel
      ? new Permissions(0n) // may change to basic perms in the future
      : this.real?.permissionsFor(memberOrRole) || new Permissions(0n);
  }

  sendTyping() {
    return new Promise((r) => r(null));
  }

  bulkDelete(
    messages:
      | Collection<Snowflake, FireMessage>
      | readonly MessageResolvable[]
      | number,
    filterOld?: boolean
  ) {
    return this.real instanceof DMChannel
      ? new Collection<string, FireMessage>()
      : this.real?.bulkDelete(messages, filterOld);
  }

  awaitMessages(options?: AwaitMessagesOptions) {
    return this.real?.awaitMessages(options);
  }

  createInvite(options?: CreateInviteOptions) {
    return !(this.real instanceof DMChannel)
      ? this.real instanceof ThreadChannel
        ? this.real.parent.createInvite(options)
        : this.real?.createInvite(options)
      : false;
  }

  // Defer interaction unless ephemeral (excl. incognito)
  async ack(ephemeral = false) {
    await this.ackLock.acquire();
    if (
      (ephemeral || (this.flags & 64) != 0) &&
      !this.message.command?.deferAnyways
    )
      return this.ackLock.release();
    if (this.message.sent) return this.ackLock.release();
    if (this.message.author.settings.get<boolean>("utils.incognito", false))
      ephemeral = true;
    await this.message.contextCommand
      .deferReply({
        ephemeral: ephemeral || !!((this.flags & 64) == 64),
        fetchReply: true,
      })
      .then((real) => {
        this.message.sent = "ack";
        if (real) this.message.latestResponse = real as FireMessage; // literally (real)
      })
      .catch(() => (this.message.sent = "ack"));
    this.ackLock.release();
  }

  async send(
    options?:
      | string
      | MessagePayload
      | (WebhookMessageOptions & { split?: false }),
    flags?: number // Used for success/error, can also be set
  ): Promise<ContextCommandMessage> {
    let apiMessage: MessagePayload;

    if (options instanceof MessagePayload) apiMessage = options.resolveData();
    else {
      apiMessage = MessagePayload.create(
        this.message.contextCommand,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    data.flags = this.flags;
    if (typeof flags == "number") data.flags = flags;

    // if (data.embeds?.length && !data.content) {
    //   // hijacking this for advertising sales instead of being a dumbass and sending unsolicited DMs (*cough* mee6 *cough*)
    //   const shouldAdd =
    //     !this.message.author.premium &&
    //     !this.message.author.settings.get("promotion.blackfridaymsg", false) &&
    //     +new Date() < 1669679999000;
    //   if (shouldAdd) {
    //     data.content = this.message.author.language.get("BLACK_FRIDAY_2022");
    //     this.message.author.settings.set("promotion.blackfridaymsg", true);
    //   }
    // }

    if (this.message.author.settings.get("utils.incognito", false))
      data.flags = 64;

    if (!this.message.sent)
      await this.client.req
        .interactions(this.interactionId)(this.token)
        .callback.post({
          data: {
            type: 4,
            data,
          },
          files,
        })
        .then(() => (this.message.sent = "message"));
    else if (this.message.sent == "ack")
      await this.client.req
        .webhooks(this.client.user.id)(this.token)
        .messages("@original")
        .patch<RawMessageData>({
          data,
          files,
        })
        .then((original) => {
          this.message.sent = "message";
          if (original && original.id)
            this.message.latestResponse = new FireMessage(
              this.client,
              original
            );
        });
    else
      await this.client.req
        .webhooks(this.client.user.id)(this.token)
        .post<RawMessageData>({
          data,
          files,
          query: { wait: true },
        })
        .then((message) => {
          this.message.sent = "message";
          if (message && message.id) {
            this.message.latestResponse = new FireMessage(this.client, message);
            this.message.latestResponseId = message.id;
          }
        });
    this.message.getLatestResponse().catch(() => {});
    return this.message;
  }
}
