import {
  AwaitMessagesOptions,
  Collection,
  CreateInviteOptions,
  DeconstructedSnowflake,
  DMChannel,
  EmojiIdentifierResolvable,
  GuildChannel,
  GuildMemberResolvable,
  MessageComponentInteraction,
  MessageComponentType,
  MessagePayload,
  MessageReaction,
  MessageResolvable,
  NewsChannel,
  Permissions,
  RoleResolvable,
  Snowflake,
  SnowflakeUtil,
  ThreadChannel,
  WebhookMessageOptions,
} from "discord.js";
import { RawMessageData, RawUserData } from "discord.js/typings/rawDataTypes";
import Semaphore from "semaphore-async-await";
import { Fire } from "../Fire";
import { BaseFakeChannel } from "../interfaces/misc";
import { constants, i18nOptions } from "../util/constants";
import { Language, LanguageKeys } from "../util/language";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";

const { reactions } = constants;

export class ComponentMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  private snowflake: DeconstructedSnowflake;
  component: MessageComponentInteraction;
  sent: false | "ack" | "message";
  getRealMessageLock: Semaphore;
  sourceMessage: FireMessage;
  type: MessageComponentType;
  latestResponse: Snowflake;
  ephemeralSource: boolean;
  private _flags: number;
  message: FireMessage;
  channel: FakeChannel;
  member: FireMember;
  language: Language;
  customId: string;
  guild: FireGuild;
  author: FireUser;
  values: string[];
  id: Snowflake;
  client: Fire;

  constructor(client: Fire, component: MessageComponentInteraction) {
    this.client = client;
    this.id = component.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.getRealMessageLock = new Semaphore(1);
    this.customId = component.customId;
    this.type = component.componentType;
    this.values = [];
    if (component.isSelectMenu()) this.values = component.values;
    this.component = component;
    this.sent = false;
    this.guild = component.guild as FireGuild;
    this.realChannel = client.channels.cache.get(component.channelId) as
      | FireTextChannel
      | NewsChannel
      | DMChannel;
    this.ephemeralSource = component.message.flags
      ? (component.message.flags.valueOf() & 64) != 0
      : false;
    this.message =
      component.message instanceof FireMessage
        ? component.message
        : new FireMessage(client, component.message as RawMessageData);
    if (component.member && this.guild)
      this.member =
        (this.guild.members.cache.get(
          component.member.user.id
        ) as FireMember) ||
        new FireMember(client, component.member, this.guild);
    this.author = component.user
      ? (client.users.cache.get(component.user.id) as FireUser) ||
        new FireUser(client, component.user as unknown as RawUserData)
      : component.member &&
        ((client.users.cache.get(component.member.user.id) as FireUser) ||
          new FireUser(client, component.member.user as RawUserData));
    this.language =
      (this.author?.settings.has("utils.language")
        ? this.author.language.id == "en-US" &&
          this.guild?.language.id != "en-US"
          ? this.guild?.language
          : this.author.language
        : this.guild?.language) ?? client.getLanguage("en-US");
    if (!this.guild) {
      this.channel = new FakeChannel(
        this,
        client,
        component.id,
        component.token,
        component.guildId ? null : this.author.dmChannel
      );
      return this;
    }
    this.channel = new FakeChannel(
      this,
      client,
      component.id,
      component.token,
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

  get ephemeral() {
    return (this.flags & (1 << 6)) == 1 << 6;
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

  get channelId() {
    return this.component.channelId;
  }

  get guildId() {
    return this.component.guildId;
  }

  send(key?: LanguageKeys, args?: i18nOptions) {
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
  ): Promise<ComponentMessage | MessageReaction | void> {
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
  ): Promise<ComponentMessage | MessageReaction | void> {
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
  ): Promise<ComponentMessage | MessageReaction | void> {
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
    await this.getRealMessageLock.wait(); // prevents fetching twice simultaneously
    if (this.ephemeralSource || this.ephemeral) return;
    if (this.sourceMessage instanceof FireMessage) return this.sourceMessage;

    const message = (await this.client.req
      .webhooks(this.client.user.id, this.component.token)
      .messages(this.latestResponse)
      .get()) as RawMessageData;
    if (message && message.id)
      this.sourceMessage = new FireMessage(this.client, message);
    this.getRealMessageLock.release();
    return this.sourceMessage;
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
      apiMessage = MessagePayload.create(this.component, options).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    data.flags = this.flags;

    await this.client.req
      .webhooks(this.client.user.id, this.component.token)
      .messages(this.latestResponse ?? "@original")
      .patch({
        data,
        files,
      });
    return this;
  }

  async delete(id?: string) {
    if (this.ephemeralSource) return;
    await this.client.req
      .webhooks(this.client.user.id, this.component.token)
      .messages(id ?? this.latestResponse ?? "@original")
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
  declare message: ComponentMessage;

  constructor(
    message: ComponentMessage,
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
    return this.real?.messages;
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

  // Acknowledges without sending a message
  async ack() {
    await this.client.req
      .interactions(this.interactionId)(this.token)
      .callback.post({
        data: { type: 6 },
      })
      .then(() => {
        this.message.sent = "ack";
      })
      .catch(() => (this.message.sent = "ack"));
  }

  // Defer interaction ephemerally
  async defer(ephemeral: boolean = false) {
    await this.message.component
      .deferReply({ ephemeral, fetchReply: !ephemeral })
      // @ts-ignore
      .then((real: FireMessage) => {
        this.message.sent = "ack";
        if (real) this.message.sourceMessage = real; // literally (real)
      })
      .catch(() => (this.message.sent = "ack"));
  }

  async send(
    options?:
      | string
      | MessagePayload
      | (WebhookMessageOptions & { split?: false }),
    flags?: number // Used for success/error, can also be set
  ): Promise<ComponentMessage> {
    let apiMessage: MessagePayload;

    if (options instanceof MessagePayload) apiMessage = options.resolveData();
    else {
      apiMessage = MessagePayload.create(
        this.message.component,
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
          this.message.latestResponse = "@original" as Snowflake;
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
            this.message.sourceMessage = new FireMessage(this.client, message);
            this.message.latestResponse =
              this.message.latestResponse == "@original"
                ? message.id
                : "@original";
          }
        });

    this.message.getRealMessage().catch(() => {});
    return this.message;
  }

  async update(
    options?:
      | string
      | MessagePayload
      | (WebhookMessageOptions & { split?: false }),
    flags?: number // Used for success/error, can also be set
  ): Promise<ComponentMessage> {
    if (this.message.sent) return; // can only update with initial response

    let apiMessage: MessagePayload;

    if (options instanceof MessagePayload) apiMessage = options.resolveData();
    else {
      apiMessage = MessagePayload.create(
        this.message.component,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    data.flags = this.flags;
    if (typeof flags == "number") data.flags = flags;

    if (
      (files?.length || this.real instanceof DMChannel) &&
      (data.flags & 64) == 64
    )
      data.flags -= 64;

    await this.client.req
      .interactions(this.interactionId)(this.token)
      .callback.post({
        data: {
          type: 7,
          data,
        },
        files,
      })
      .then(() => {
        this.message.sent = "message";
        this.message.latestResponse = "@original" as Snowflake;
      });
    this.message.getRealMessage().catch(() => {});
    return this.message;
  }
}
