import { Snowflake } from "discord-api-types/globals";
import {
  AwaitMessagesOptions,
  Collection,
  CreateInviteOptions,
  DeconstructedSnowflake,
  DMChannel,
  GuildChannel,
  GuildMemberResolvable,
  MessagePayload,
  MessageReaction,
  MessageResolvable,
  ModalSubmitInteraction,
  NewsChannel,
  Permissions,
  RoleResolvable,
  SnowflakeUtil,
  ThreadChannel,
  WebhookMessageOptions,
} from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { RawMessageData, RawUserData } from "discord.js/typings/rawDataTypes";
import Semaphore from "semaphore-async-await";
import { Fire } from "../Fire";
import { BaseFakeChannel } from "../interfaces/misc";
import { i18nOptions } from "../util/constants";
import { LanguageKeys } from "../util/language";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";

export class ModalMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  private snowflake: DeconstructedSnowflake;
  interaction: ModalSubmitInteraction;
  components: ModalSubmitInteraction["components"];
  getLatestResponseLock: Semaphore;
  sent: false | "ack" | "message";
  latestResponse: FireMessage;
  latestResponseId: Snowflake;
  private _flags: number = 0;
  ephemeralSource: boolean;
  message?: FireMessage;
  channel: FakeChannel;
  member: FireMember;
  customId: string;
  guild: FireGuild;
  author: FireUser;
  values: string[];
  id: Snowflake;
  client: Fire;

  constructor(client: Fire, modal: ModalSubmitInteraction) {
    this.client = client;
    this.id = modal.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.customId = modal.customId;
    this.values = [];
    if (modal.isSelectMenu()) this.values = modal.values;
    this.interaction = modal;
    this.sent = false;
    this.guild = modal.guild as FireGuild;
    this.realChannel = client.channels.cache.get(modal.channelId) as
      | FireTextChannel
      | NewsChannel
      | DMChannel;
    this.components = modal.components;
    if (modal.message)
      this.message =
        modal.message instanceof FireMessage
          ? modal.message
          : new FireMessage(client, modal.message as RawMessageData);
    if (modal.member && this.guild)
      this.member =
        (this.guild.members.cache.get(modal.member.user.id) as FireMember) ||
        new FireMember(client, modal.member, this.guild);
    this.author = modal.user
      ? (client.users.cache.get(modal.user.id) as FireUser) ||
        new FireUser(client, modal.user as unknown as RawUserData)
      : modal.member &&
        ((client.users.cache.get(modal.member.user.id) as FireUser) ||
          new FireUser(client, modal.member.user as RawUserData));
    if (!this.guild) {
      this.channel = new FakeChannel(
        this,
        client,
        modal.id,
        modal.token,
        modal.guildId ? undefined : this.author.dmChannel
      );
      return this;
    }
    this.channel = new FakeChannel(
      this,
      client,
      modal.id,
      modal.token,
      this.realChannel
    );
  }

  get language() {
    return (
      (this.author?.settings.has("utils.language")
        ? this.author.language
        : this.guild?.language) ?? this.client.getLanguage("en-US")
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
    if (this.guildId) return this.client.util.getShard(this.guildId);
    else return 0;
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

  get editedTimestamp() {
    return 0;
  }

  get createdAt() {
    return this.snowflake.date;
  }

  get createdTimestamp() {
    return this.snowflake.timestamp;
  }

  get channelId() {
    return this.interaction.channelId;
  }

  get guildId() {
    return this.interaction.guildId;
  }

  hasField(field: string) {
    try {
      this.interaction.fields.getField(field);
      return true;
    } catch {
      return false;
    }
  }

  getField(field: string) {
    if (this.hasField(field)) return this.interaction.fields.getField(field);
  }

  getTextInputValue(field: string) {
    if (this.hasField(field))
      return this.interaction.fields.getTextInputValue(field);
  }

  getStringSelectValues(field: string) {
    if (this.hasField(field))
      return this.interaction.fields.getStringSelectValues(field);
  }

  getSelectedUsers(field: string, required?: boolean) {
    if (this.hasField(field))
      return this.interaction.fields.getSelectedUsers(field, required);
  }

  getSelectedMembers(field: string) {
    if (this.hasField(field))
      return this.interaction.fields.getSelectedMembers(field);
  }

  getSelectedChannels(
    field: string,
    required?: boolean,
    channelTypes: ChannelTypes[] = []
  ) {
    if (this.hasField(field))
      return this.interaction.fields.getSelectedChannels(
        field,
        required,
        channelTypes
      );
  }

  getSelectedRoles(field: string, required?: boolean) {
    if (this.hasField(field))
      return this.interaction.fields.getSelectedRoles(field, required);
  }

  getSelectedMentionables(field: string, required?: boolean) {
    if (this.hasField(field))
      return this.interaction.fields.getSelectedMentionables(field, required);
  }

  getUploadedFiles(field: string, required?: boolean) {
    if (this.hasField(field))
      return this.interaction.fields.getUploadedFiles(field, required);
  }

  send(key?: LanguageKeys, args?: i18nOptions) {
    return this.channel.send(
      {
        content: this.language.get(key, args),
        allowedMentions: args?.allowedMentions,
        components: args?.components,
        embeds: args?.embeds,
      },
      this.flags
    );
  }

  success(
    key: LanguageKeys,
    args?: i18nOptions
  ): Promise<ModalMessage | MessageReaction | void> {
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
  ): Promise<ModalMessage | MessageReaction | void> {
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
  ): Promise<ModalMessage | MessageReaction | void> {
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
      .webhooks(this.client.user.id, this.interaction.token)
      .messages(this.latestResponseId)
      .get()) as RawMessageData;
    if (message && message.id)
      this.latestResponse = new FireMessage(this.client, message);
    this.getLatestResponseLock.release();
    return this.latestResponse;
  }

  async getResponse(messageId: Snowflake) {
    const message = (await this.client.req
      .webhooks(this.client.user.id, this.interaction.token)
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
        this.interaction,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    data.flags |= this.flags;

    await this.client.req
      .webhooks(this.client.user.id, this.interaction.token)
      .messages(this.latestResponseId ?? "@original")
      .patch({
        data,
        files,
      })
      .catch(() => {});
    return this;
  }

  async delete(id?: string) {
    if (this.ephemeralSource) return;
    await this.client.req
      .webhooks(this.client.user.id, this.interaction.token)
      .messages(id ?? this.latestResponseId ?? "@original")
      .delete()
      .catch(() => {});
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
  declare message: ModalMessage;
  ackLock = new Semaphore(1);

  constructor(
    message: ModalMessage,
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
    await this.ackLock.acquire();
    if (this.message.sent) return this.ackLock.release();
    await this.client.req
      .interactions(this.interactionId)(this.token)
      .callback.post({
        data: { type: 6 },
      })
      .then(() => {
        this.message.sent = "ack";
      })
      .catch(() => {
        this.message.sent = "ack";
      });
    this.ackLock.release();
  }

  // Defer interaction ephemerally
  async defer(ephemeral: boolean = false) {
    await this.message.interaction
      .deferReply({ ephemeral, fetchReply: !ephemeral })
      .then(() => {
        this.message.sent = "ack";
      })
      .catch(() => {
        this.message.sent = "ack";
      });
  }

  async send(
    options?:
      | string
      | MessagePayload
      | (WebhookMessageOptions & { split?: false }),
    flags?: number // Used for success/error, can also be set
  ): Promise<ModalMessage> {
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

    data.flags |= this.flags;
    if (typeof flags == "number") data.flags |= flags;

    if (this.message.author.settings.get("utils.incognito", false))
      data.flags |= 64;

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

  async update(
    options?:
      | string
      | MessagePayload
      | (WebhookMessageOptions & { split?: false }),
    flags?: number // Used for success/error, can also be set
  ): Promise<ModalMessage> {
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

    data.flags |= this.flags;
    if (typeof flags == "number") data.flags |= flags;

    if (this.message.author.settings.get("utils.incognito", false))
      data.flags |= 64;

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
        this.message.latestResponseId = "@original" as Snowflake;
      })
      .catch(() => {});
    return this.message;
  }
}
