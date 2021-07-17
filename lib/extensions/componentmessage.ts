import {
  MessageComponentInteraction,
  EmojiIdentifierResolvable,
  WebhookEditMessageOptions,
  DeconstructedSnowflake,
  GuildMemberResolvable,
  WebhookMessageOptions,
  AwaitMessagesOptions,
  MessageComponentType,
  CreateInviteOptions,
  MessageEditOptions,
  MessageResolvable,
  MessageReaction,
  RoleResolvable,
  MessagePayload,
  SnowflakeUtil,
  ThreadChannel,
  GuildChannel,
  MessageEmbed,
  NewsChannel,
  Permissions,
  Collection,
  Snowflake,
  DMChannel,
  Webhook,
} from "discord.js";
import { Language, LanguageKeys } from "../util/language";
import { FireTextChannel } from "./textchannel";
import { APIMessage } from "discord-api-types";
import { TOptions, StringMap } from "i18next";
import { constants } from "../util/constants";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

const { emojis, reactions } = constants;
export type EphemeralMessage = { id: Snowflake; flags: number };

export class ComponentMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  private snowflake: DeconstructedSnowflake;
  interaction: MessageComponentInteraction;
  message: FireMessage | EphemeralMessage;
  sent: false | "ack" | "message";
  sourceMessage: FireMessage;
  type: MessageComponentType;
  latestResponse: Snowflake;
  private _flags: number;
  channel: FakeChannel;
  ephemeral: boolean;
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
    this.customId = component.customId;
    this.type = component.componentType;
    this.values = [];
    if (component.isSelectMenu()) this.values = component.values;
    this.interaction = component;
    this.sent = false;
    this.guild = component.guild as FireGuild;
    this.realChannel = client.channels.cache.get(component.channelId) as
      | FireTextChannel
      | NewsChannel
      | DMChannel;
    this.ephemeral = component.message.flags
      ? (component.message.flags.valueOf() & 64) != 0
      : false;
    this.message = this.ephemeral
      ? (component.message as EphemeralMessage)
      : component.message instanceof FireMessage
      ? component.message
      : new FireMessage(client, component.message, this.realChannel);
    if (component.member)
      this.member =
        (this.guild.members.cache.get(
          component.member.user.id
        ) as FireMember) ||
        new FireMember(client, component.member, this.guild);
    this.author = component.user
      ? (client.users.cache.get(component.user.id) as FireUser) ||
        new FireUser(client, component.user)
      : component.member &&
        ((client.users.cache.get(component.member.user.id) as FireUser) ||
          new FireUser(client, component.member.user));
    this.language = this.author?.settings.has("utils.language")
      ? this.author.language.id == "en-US" && this.guild?.language.id != "en-US"
        ? this.guild?.language
        : this.author.language
      : this.guild?.language || client.getLanguage("en-US");
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

  send(key?: LanguageKeys, args?: TOptions<StringMap>) {
    return this.channel.send(
      { content: this.language.get(key, args) },
      this.flags
    );
  }

  success(
    key?: LanguageKeys,
    args?: TOptions<StringMap>
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
      `${emojis.success} ${this.language.get(key, args)}`,
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  warn(
    key?: LanguageKeys,
    args?: TOptions<StringMap>
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
      `${emojis.warning} ${this.language.get(key, args)}`,
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  error(
    key?: LanguageKeys,
    args?: TOptions<StringMap>
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
      `${emojis.slashError} ${this.language.get(key, args)}`,
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  async getRealMessage() {
    if (!this.realChannel || this.ephemeral) return;
    if (this.sourceMessage instanceof FireMessage) return this.sourceMessage;

    let messageId = this.latestResponse;
    if (messageId == "@original") {
      const message = await this.client.req
        .webhooks(this.client.user.id, this.interaction.token)
        .messages(messageId)
        .get<APIMessage>()
        .catch(() => {});
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
        this.interaction,
        options
      ).resolveData();
    }

    const { data } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    data.flags = this.flags;

    await this.client.req
      .webhooks(this.client.user.id, this.interaction.token)
      .messages(this.latestResponse ?? "@original")
      .patch({
        data,
      })
      .catch(() => {});
    return this;
  }

  async delete(id?: string) {
    if (this.ephemeral) return;
    await this.client.req
      .webhooks(this.client.user.id, this.interaction.token)
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
}

export class FakeChannel {
  real: FireTextChannel | ThreadChannel | NewsChannel | DMChannel;
  message: ComponentMessage;
  guild: FireGuild;
  token: string;
  client: Fire;
  id: string;

  constructor(
    message: ComponentMessage,
    client: Fire,
    id: string,
    token: string,
    real?: FireTextChannel | NewsChannel | DMChannel
  ) {
    this.id = id;
    this.real = real;
    this.token = token;
    this.client = client;
    this.message = message;

    if (!(real instanceof DMChannel) && real?.guild)
      this.guild = real.guild as FireGuild;
    else if (this.message.guild) this.guild = this.message.guild;
  }

  get flags() {
    return this.message.flags;
  }

  get permissionOverwrites() {
    return this.real instanceof GuildChannel
      ? this.real.permissionOverwrites
      : null;
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

  startTyping(count?: number) {
    return new Promise(() => {});
  }

  stopTyping(force?: boolean) {
    return;
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
      .interactions(this.id)(this.token)
      .callback.post({
        data: { type: 6 },
      })
      .then(() => {
        this.message.sent = "ack";
      })
      .catch(() => (this.message.sent = "ack"));
  }

  // Defer interaction ephemerally
  async defer() {
    await this.message.interaction
      .defer({ ephemeral: true })
      .then(() => {
        this.message.sent = "ack";
        this.message.getRealMessage().catch(() => {});
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
        this.message.interaction,
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

    if (!this.message.sent)
      await this.client.req
        .interactions(this.id)(this.token)
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
        })
        .catch(() => {});
    else {
      const message = await this.client.req
        .webhooks(this.client.user.id)(this.token)
        .post<APIMessage>({
          data,
          files,
          query: { wait: true },
        })
        .catch(() => {});
      if (message && message.id && this.message.latestResponse == "@original")
        this.message.latestResponse = message.id;
      else this.message.latestResponse = "@original" as Snowflake;
    }
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
        this.message.interaction,
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
      .interactions(this.id)(this.token)
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
      })
      .catch(() => {});
    this.message.getRealMessage().catch(() => {});
    return this.message;
  }
}
