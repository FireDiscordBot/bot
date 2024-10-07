import { APIMessage } from "discord-api-types/v9";
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
  PartialModalActionRow,
  Permissions,
  RoleResolvable,
  Snowflake,
  SnowflakeUtil,
  ThreadChannel,
  WebhookMessageOptions,
} from "discord.js";
import { RawUserData } from "discord.js/typings/rawDataTypes";
import Semaphore from "semaphore-async-await";
import { Fire } from "../Fire";
import { BaseFakeChannel } from "../interfaces/misc";
import { i18nOptions } from "../util/constants";
import { Language, LanguageKeys } from "../util/language";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";

export class ModalMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  private snowflake: DeconstructedSnowflake;
  interaction: ModalSubmitInteraction;
  components: PartialModalActionRow[];
  sent: false | "ack" | "message";
  latestResponse: Snowflake;
  ephemeralSource: boolean;
  private _flags: number;
  // message: FireMessage;
  channel: FakeChannel;
  member: FireMember;
  language: Language;
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
        modal.id,
        modal.token,
        modal.guildId ? null : this.author.dmChannel
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

    data.flags = this.flags;

    await this.client.req
      .webhooks(this.client.user.id, this.interaction.token)
      .messages(this.latestResponse ?? "@original")
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
      .messages(id ?? this.latestResponse ?? "@original")
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
      .catch(() => (this.message.sent = "ack"));
    this.ackLock.release();
  }

  // Defer interaction ephemerally
  async defer(ephemeral: boolean = false) {
    await this.message.interaction
      .deferReply({ ephemeral, fetchReply: !ephemeral })
      // @ts-ignore
      .then(() => {
        this.message.sent = "ack";
      })
      .catch(() => (this.message.sent = "ack"));
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

    data.flags = this.flags;
    if (typeof flags == "number") data.flags = flags;

    if (this.message.author.settings.get("utils.incognito", false))
      data.flags = 64;

    const message = await this.client.req
      .webhooks(this.client.user.id)(this.token)
      .post<APIMessage>({
        data,
        files,
        query: { wait: true },
      })
      .catch(() => {});
    if (message && message.id) this.message.latestResponse = message.id;
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

    data.flags = this.flags;
    if (typeof flags == "number") data.flags = flags;

    if (this.message.author.settings.get("utils.incognito", false))
      data.flags = 64;

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
      })
      .catch(() => {});
    return this.message;
  }
}
