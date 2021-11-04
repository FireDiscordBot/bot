import {
  CommandInteractionOptionResolver,
  EmojiIdentifierResolvable,
  ContextMenuInteraction,
  DeconstructedSnowflake,
  GuildMemberResolvable,
  WebhookMessageOptions,
  AwaitMessagesOptions,
  CreateInviteOptions,
  MessageResolvable,
  MessageAttachment,
  MessageMentions,
  MessageReaction,
  MessagePayload,
  RoleResolvable,
  ThreadChannel,
  SnowflakeUtil,
  GuildChannel,
  Permissions,
  NewsChannel,
  MessageType,
  Collection,
  DMChannel,
  Snowflake,
} from "discord.js";
import { ArgumentOptions, Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { constants, i18nOptions } from "@fire/lib/util/constants";
import { RawUserData } from "discord.js/typings/rawDataTypes";
import { CommandUtil } from "@fire/lib/util/commandutil";
import { BaseFakeChannel } from "../interfaces/misc";
import { FireTextChannel } from "./textchannel";
import { APIMessage } from "discord-api-types";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";
import { FireUser } from "./user";

const { emojis, reactions } = constants;

export class ContextCommandMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  attachments: Collection<string, MessageAttachment>;
  private snowflake: DeconstructedSnowflake;
  contextCommand: ContextMenuInteraction;
  sent: false | "ack" | "message";
  type: MessageType = "DEFAULT";
  sourceMessage: FireMessage;
  mentions: MessageMentions;
  latestResponse: Snowflake;
  private _flags: number;
  channel: FakeChannel;
  member?: FireMember;
  language: Language;
  guild?: FireGuild;
  util: CommandUtil;
  command: Command;
  author: FireUser;
  webhookId = null;
  content: string;
  id: Snowflake;
  client: Fire;

  constructor(client: Fire, command: ContextMenuInteraction) {
    this.client = client;
    this.id = command.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.contextCommand = command;
    this.guild = client.guilds.cache.get(command.guildId) as FireGuild;
    this.command = this.client.getContextCommand(command.commandName);
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
    this.latestResponse = "@original" as Snowflake;
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
        command.guildId ? null : this.author.dmChannel
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

  get editedAt() {
    if (this.sourceMessage && this.sourceMessage instanceof FireMessage)
      return this.sourceMessage.editedAt;
    return null;
  }

  get editedTimestamp() {
    if (this.sourceMessage && this.sourceMessage instanceof FireMessage)
      return this.sourceMessage.editedTimestamp;
    return 0;
  }

  get createdAt() {
    if (this.sourceMessage && this.sourceMessage instanceof FireMessage)
      return this.sourceMessage.createdAt;
    return this.snowflake.date;
  }

  get createdTimestamp() {
    if (this.sourceMessage && this.sourceMessage instanceof FireMessage)
      return this.sourceMessage.createdTimestamp;
    return this.snowflake.timestamp;
  }

  get url() {
    if (this.sourceMessage)
      return `https://discord.com/channels/${
        this.guild ? this.guild.id : "@me"
      }/${this.realChannel?.id || "0"}/${this.sourceMessage.id}`;
    else
      return `https://discord.com/channels/${
        this.guild ? this.guild.id : "@me"
      }/${this.realChannel?.id || "0"}/${this.id}`;
  }

  get channelId() {
    return this.contextCommand.channelId;
  }

  getMessage(required = false) {
    return this.contextCommand.options.getMessage("message", required);
  }

  getUser(required = false) {
    return this.contextCommand.options.getUser("user", required);
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
      if (this.sourceMessage instanceof FireMessage)
        return this.sourceMessage.react(reactions.success).catch(() => {});
      else
        return this.getRealMessage().then((message) => {
          if (!message || !(message instanceof FireMessage))
            return this.success("SLASH_COMMAND_HANDLE_SUCCESS");
          message.react(reactions.success).catch(() => {
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
      if (this.sourceMessage instanceof FireMessage)
        return this.sourceMessage.react(reactions.warning).catch(() => {});
      else
        return this.getRealMessage().then((message) => {
          if (!message || !(message instanceof FireMessage))
            return this.warn("SLASH_COMMAND_HANDLE_FAIL");
          message.react(reactions.warning).catch(() => {
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
      if (this.sourceMessage instanceof FireMessage)
        return this.sourceMessage.react(reactions.error).catch(() => {});
      else
        return this.getRealMessage().then((message) => {
          if (!message || !(message instanceof FireMessage))
            return this.error("SLASH_COMMAND_HANDLE_FAIL");
          message.react(reactions.error).catch(() => {
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

  async getRealMessage() {
    if (!this.realChannel) return;
    if (this.sourceMessage instanceof FireMessage) return this.sourceMessage;

    let messageId = this.latestResponse as Snowflake;
    if (messageId == "@original") {
      const message = await this.contextCommand.fetchReply().catch(() => {});
      if (message) messageId = message.id;
    }

    const message = (await this.realChannel.messages
      .fetch(messageId)
      .catch(() => {})) as FireMessage;
    if (message) this.sourceMessage = message;
    return message;
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
      .messages(this.latestResponse)
      .patch({
        data,
        files,
      })
      .catch(() => {});
    return this;
  }

  async delete() {
    await this.client.req
      .webhooks(this.client.user.id, this.contextCommand.token)
      .messages(this.latestResponse)
      .delete()
      .catch(() => {});
  }

  async react(emoji: EmojiIdentifierResolvable) {
    await this.getRealMessage();
    if (!this.sourceMessage || typeof this.sourceMessage.react != "function")
      return;

    return await this.sourceMessage.react(emoji);
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
    return new Promise(() => {});
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

  // Defer interaction unless ephemeral
  async ack(ephemeral = false) {
    if (ephemeral || (this.flags & 64) != 0) return;
    await this.message.contextCommand
      .deferReply({ ephemeral: !!((this.flags & 64) == 64), fetchReply: true })
      .then((real) => {
        this.message.sent = "ack";
        if (real) this.message.sourceMessage = real as FireMessage; // literally (real)
      })
      .catch(() => (this.message.sent = "ack"));
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

    // embeds in ephemeral wen eta
    if (
      (files?.length || this.real instanceof DMChannel) &&
      (data.flags & 64) == 64
    )
      data.flags -= 64;

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
        .then(() => {
          this.message.sent = "message";
        })
        .catch(() => {});
    else if (this.message.sent == "ack") {
      await this.client.req
        .webhooks(this.client.user.id)(this.token)
        .messages("@original")
        .patch({
          data,
          files,
        })
        .then(() => {
          this.message.sent = "message";
        })
        .catch(() => {});
    } else {
      const message = await this.client.req
        .webhooks(this.client.user.id)(this.token)
        .post<APIMessage>({
          data,
          files,
          query: { wait: true },
        })
        .then((message) => {
          this.message.sent = "message";
          return message;
        })
        .catch(() => {});
      if (message && message.id) this.message.latestResponse = message.id;
    }
    this.message.getRealMessage().catch(() => {});
    return this.message;
  }
}
