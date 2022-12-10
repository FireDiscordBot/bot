import { Fire } from "@fire/lib/Fire";
import { ArgumentOptions, Command } from "@fire/lib/util/command";
import { CommandUtil } from "@fire/lib/util/commandutil";
import { constants, i18nOptions } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { APIMessage, PermissionFlagsBits } from "discord-api-types/v9";
import {
  AutocompleteInteraction,
  AwaitMessagesOptions,
  Collection,
  CommandInteractionOptionResolver,
  CreateInviteOptions,
  DeconstructedSnowflake,
  DMChannel,
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
  Snowflake,
  SnowflakeUtil,
  StartThreadOptions,
  ThreadChannel,
  Util,
  WebhookMessageOptions,
} from "discord.js";
import { RawUserData } from "discord.js/typings/rawDataTypes";
import { BaseFakeChannel } from "../interfaces/misc";
import { GuildTagManager } from "../util/guildtagmanager";
import { CommandInteraction } from "./commandinteraction";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";

const { emojis, reactions } = constants;

export class ApplicationCommandMessage {
  slashCommand: CommandInteraction | AutocompleteInteraction;
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  attachments: Collection<string, MessageAttachment>;
  private snowflake: DeconstructedSnowflake;
  groupActivityApplication: never;
  sent: false | "ack" | "message";
  type: MessageType = "DEFAULT";
  sourceMessage: FireMessage;
  mentions: MessageMentions;
  latestResponse: Snowflake;
  private _flags: number;
  channel: FakeChannel;
  content: string = "";
  deleteReason: string;
  member?: FireMember;
  language: Language;
  guild?: FireGuild;
  util: CommandUtil;
  command: Command;
  author: FireUser;
  components = [];
  starLock: never;
  activity: never;
  deleted = false;
  id: Snowflake;
  client: Fire;

  constructor(
    client: Fire,
    command: CommandInteraction | AutocompleteInteraction
  ) {
    this.client = client;
    this.id = command.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.slashCommand = command;
  }

  async init() {
    if (
      this.slashCommand.options.data.find((opt) => opt.type == "SUB_COMMAND")
    ) {
      this.slashCommand.commandName = `${
        this.slashCommand.commandName
      }-${this.slashCommand.options.getSubcommand()}`;
      this.slashCommand.options = new CommandInteractionOptionResolver(
        this.client,
        this.slashCommand.options.data.find((opt) => opt.type == "SUB_COMMAND")
          .options ?? [],
        this.slashCommand.options.resolved
      );
    } else if (
      this.slashCommand.options.data.find(
        (opt) => opt.type == "SUB_COMMAND_GROUP"
      )
    ) {
      this.slashCommand.commandName = `${
        this.slashCommand.commandName
      }-${this.slashCommand.options.getSubcommandGroup()}-${this.slashCommand.options.getSubcommand()}`;
      this.slashCommand.options = new CommandInteractionOptionResolver(
        this.client,
        this.slashCommand.options.data
          .find((opt) => opt.type == "SUB_COMMAND_GROUP")
          .options.find(
            (option) => option.name == this.slashCommand.options.getSubcommand()
          ).options ?? [],
        this.slashCommand.options.resolved
      );
    }
    this._flags = 0;
    this.guild = this.client.guilds.cache.get(
      this.slashCommand.guildId
    ) as FireGuild;
    // @mason pls just always include user ty
    const user = this.slashCommand.user ?? this.slashCommand.member?.user;
    this.author =
      (this.client.users.cache.get(user.id) as FireUser) ||
      new FireUser(this.client, user as RawUserData);
    this.command =
      this.client.getCommand(this.slashCommand.commandName) ||
      this.client.getContextCommand(this.slashCommand.commandName);
    if (!this.command && this.guild && !this.guild?.tags) {
      // this might take a couple seconds so we will ack now
      this.channel = new FakeChannel(
        this,
        this.client,
        this.slashCommand.id,
        this.slashCommand.token,
        this.realChannel
      );
      this.channel.ack(
        this.guild.settings.get<boolean>("tags.ephemeral", true) ||
          this.author.settings.get<boolean>("utils.incognito", false)
      );
      this.guild.tags = new GuildTagManager(this.client, this.guild);
      await this.guild.tags.init();
    }
    if (
      this.guild?.tags?.slashCommands?.[this.slashCommand.commandId] ==
      this.slashCommand.commandName
    ) {
      this.command = this.client.getCommand("tag-view");
      this.slashCommand.options = new CommandInteractionOptionResolver(
        this.client,
        [
          {
            name: "tag",
            value: this.slashCommand.commandName,
            type: "STRING",
          },
        ],
        this.slashCommand.options.resolved
      );
      if (this.guild.tags.ephemeral) this.flags = 64;
    } else if (this.command?.ephemeral) this.flags = 64;
    // @ts-ignore
    this.mentions = new MessageMentions(this, [], [], false);
    this.attachments = new Collection();
    if (this.guild) {
      this.member =
        (this.guild.members.cache.get(this.author.id) as FireMember) ||
        new FireMember(this.client, this.slashCommand.member, this.guild);
    }
    this.language =
      (this.author?.settings.has("utils.language")
        ? this.author.language.id == "en-US" &&
          this.guild?.language.id != "en-US"
          ? this.guild?.language
          : this.author.language
        : this.guild?.language) ?? this.client.getLanguage("en-US");
    this.realChannel = this.client.channels.cache.get(
      this.slashCommand.channelId
    ) as FireTextChannel | NewsChannel | DMChannel;
    this.latestResponse = "@original" as Snowflake;
    this.sent = false;
    this.util = new CommandUtil(this.client.commandHandler, this);
    if (!this.guild) {
      // This will happen if a guild authorizes w/applications.commands only
      // or if a slash command is invoked in DMs (discord/discord-api-docs #2568)
      this.channel = new FakeChannel(
        this,
        this.client,
        this.slashCommand.id,
        this.slashCommand.token,
        this.slashCommand.guildId ? null : this.author.dmChannel
      );
      return this;
    } else if (!this.channel)
      this.channel = new FakeChannel(
        this,
        this.client,
        this.slashCommand.id,
        this.slashCommand.token,
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

  get guildId() {
    return this.slashCommand.guildId;
  }

  get channelId() {
    return this.slashCommand.channelId;
  }

  get applicationId() {
    return this.slashCommand.applicationId;
  }

  get webhookId() {
    return null;
  }

  get cleanContent() {
    return this.language.get("USER_USED_SLASH_COMMAND", {
      user: this.author.toString(),
      cmd: this.slashCommand.commandName,
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
          this.guild.me.communicationDisabledUntilTimestamp < Date.now())
    );
  }

  get selfDelete() {
    return false;
  }

  get editable() {
    return true;
  }

  get hasThread() {
    return this.sourceMessage?.hasThread ?? false;
  }

  get thread() {
    return this.realChannel instanceof NewsChannel ||
      this.realChannel instanceof FireTextChannel
      ? this.realChannel.threads.cache.get(this.sourceMessage.id)
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
    return this.sourceMessage?.partial ?? true;
  }

  get pinnable() {
    return true;
  }

  get pinned() {
    return this.sourceMessage?.pinned ?? false;
  }

  get system() {
    return false;
  }

  get reactions() {
    return (
      this.sourceMessage?.reactions ??
      new ReactionManager(this as unknown as FireMessage)
    );
  }

  get stickers() {
    return this.sourceMessage?.stickers ?? new Collection();
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
    return this.sourceMessage?.embeds ?? [];
  }

  get nonce() {
    return "deez nuts";
  }

  async generateContent() {
    // thiss has any types and I don't like it but in feature/better-slash-commands this isn't necessary so whatever
    // it's fine for now
    let content = `/${this.command.id} `;
    if (this.command.args?.length && this.slashCommand.options?.data.length) {
      const commandArgs = this.command.args as ArgumentOptions[];
      const argNames = this.slashCommand.options.data.map((opt) => opt.name);
      const sortedArgs = Object.values(this.slashCommand.options.data).sort(
        (a: any, b: any) =>
          argNames.indexOf(a.name.toLowerCase()) -
          argNames.indexOf(b.name.toLowerCase())
      );
      let args = sortedArgs.map((opt: any) => {
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

  toJSON() {
    return Util.flatten(this);
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

  async success(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ApplicationCommandMessage | MessageReaction | void> {
    if (!key) {
      if (this.sourceMessage instanceof FireMessage)
        try {
          return this.sourceMessage.react(reactions.success);
        } catch (e) {}
      else {
        const message = await this.getRealMessage();
        if (!message || !(message instanceof FireMessage) || this.sent == "ack")
          return this.success("SLASH_COMMAND_HANDLE_SUCCESS");
        else
          message.react(reactions.success).catch(() => {
            return this.success("SLASH_COMMAND_HANDLE_SUCCESS");
          });
      }
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

  async warn(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ApplicationCommandMessage | MessageReaction | void> {
    if (!key) {
      if (this.sourceMessage instanceof FireMessage)
        try {
          return this.sourceMessage.react(reactions.warning);
        } catch (e) {}
      else {
        const message = await this.getRealMessage();
        if (!message || !(message instanceof FireMessage) || this.sent == "ack")
          return this.warn("SLASH_COMMAND_HANDLE_FAIL");
        else
          message.react(reactions.warning).catch(() => {
            return this.warn("SLASH_COMMAND_HANDLE_FAIL");
          });
      }
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

  async error(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ApplicationCommandMessage | MessageReaction | void> {
    if (!this.sent && (this.flags & 64) != 64) this.flags = 64;
    if (!key) {
      if (this.sourceMessage instanceof FireMessage)
        try {
          return this.sourceMessage.react(reactions.error);
        } catch (e) {}
      else {
        const message = await this.getRealMessage();
        if (!message || !(message instanceof FireMessage) || this.sent == "ack")
          return this.error("SLASH_COMMAND_HANDLE_FAIL");
        else
          message.react(reactions.error).catch(() => {
            return this.error("SLASH_COMMAND_HANDLE_FAIL");
          });
      }
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
    if (!this.realChannel || this.slashCommand.isAutocomplete()) return;
    if (this.sourceMessage instanceof FireMessage) return this.sourceMessage;

    let messageId = this.latestResponse as Snowflake;
    if (messageId == "@original") {
      const message = await this.slashCommand.fetchReply().catch(() => {});
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
        this.slashCommand,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    await this.client.req
      .webhooks(this.client.user.id, this.slashCommand.token)
      .messages(this.latestResponse)
      .patch({
        data,
        files,
      })
      .catch((e) => {});
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
      .webhooks(this.client.user.id, this.slashCommand.token)
      .messages(this.latestResponse)
      .delete()
      .then((m: ApplicationCommandMessage) => {
        if (options?.reason) m.deleteReason = options.reason;
        return m;
      })
      .catch(() => {});
  }

  async react(emoji: EmojiIdentifierResolvable) {
    await this.getRealMessage();
    if (!this.sourceMessage || typeof this.sourceMessage.react != "function")
      return;

    return await this.sourceMessage.react(emoji);
  }

  async fetch(force?: boolean) {
    await this.sourceMessage?.fetch(force);
    return this;
  }

  async pin() {
    await this.sourceMessage?.pin();
    return this;
  }

  async startThread(options: StartThreadOptions) {
    return this.sourceMessage?.startThread(options);
  }

  resolveComponent(customId: string) {
    return this.sourceMessage?.resolveComponent(customId);
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
  declare message: ApplicationCommandMessage;

  constructor(
    message: ApplicationCommandMessage,
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

  // Defer interaction unless ephemeral & not set to defer anyways
  async ack(ephemeral = false) {
    if (
      ((ephemeral || (this.flags & 64) != 0) &&
        !this.message.command?.deferAnyways) ||
      this.message.slashCommand.isAutocomplete()
    )
      return;
    if (this.message.sent) return;
    if (this.message.author.settings.get<boolean>("utils.incognito", false))
      ephemeral = true;
    await this.message.slashCommand
      .deferReply({
        ephemeral: ephemeral || !!((this.flags & 64) == 64),
        fetchReply: true,
      })
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
  ): Promise<ApplicationCommandMessage> {
    let apiMessage: MessagePayload;

    if (options instanceof MessagePayload) apiMessage = options.resolveData();
    else {
      apiMessage = MessagePayload.create(
        this.message.slashCommand,
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

    if (this.real instanceof DMChannel && (data.flags & 64) == 64)
      data.flags -= 64;
    else if (this.message.author.settings.get("utils.incognito", false))
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
