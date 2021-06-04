import {
  MessageComponentInteraction,
  PermissionOverwriteOptions,
  EmojiIdentifierResolvable,
  WebhookEditMessageOptions,
  DeconstructedSnowflake,
  GuildMemberResolvable,
  WebhookMessageOptions,
  AwaitMessagesOptions,
  MessageEditOptions,
  MessageResolvable,
  MessageAdditions,
  MessageReaction,
  CollectorFilter,
  MessageManager,
  RoleResolvable,
  UserResolvable,
  InviteOptions,
  SnowflakeUtil,
  MessageEmbed,
  NewsChannel,
  Permissions,
  APIMessage,
  Collection,
  Snowflake,
  DMChannel,
  Webhook,
} from "discord.js";
import { APIMessage as DiscordAPIMessage } from "discord-api-types";
import { FireTextChannel } from "./textchannel";
import { constants } from "../util/constants";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

const { emojis, reactions } = constants;
export type EphemeralMessage = { id: Snowflake; flags: number };

export class ButtonMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  private snowflake: DeconstructedSnowflake;
  message: FireMessage | EphemeralMessage;
  interaction: MessageComponentInteraction;
  sent: false | "ack" | "message";
  sourceMessage: FireMessage;
  latestResponse: Snowflake;
  private _flags: number;
  channel: FakeChannel;
  ephemeral: boolean;
  member: FireMember;
  language: Language;
  customID: string;
  guild: FireGuild;
  author: FireUser;
  id: Snowflake;
  client: Fire;

  constructor(client: Fire, button: MessageComponentInteraction) {
    this.client = client;
    this.id = button.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.customID = button.customID;
    this.interaction = button;
    this.sent = false;
    this.guild = button.guild as FireGuild;
    this.realChannel = client.channels.cache.get(button.channelID) as
      | FireTextChannel
      | NewsChannel
      | DMChannel;
    this.ephemeral = button.message.flags
      ? (button.message.flags.valueOf() & 64) != 0
      : false;
    this.message = this.ephemeral
      ? (button.message as EphemeralMessage)
      : button.message instanceof FireMessage
      ? button.message
      : new FireMessage(client, button.message, this.realChannel);
    if (
      !this.message ||
      (!this.ephemeral &&
        !(this.message as FireMessage).components?.find(
          (component) =>
            component.type == "ACTION_ROW" &&
            component.components.find(
              (component) => component.customID == this.customID
            )
        ))
    )
      throw new Error("Component checks failed, potential mitm/selfbot?");
    if (button.member)
      this.member =
        (this.guild.members.cache.get(button.member.user.id) as FireMember) ||
        new FireMember(client, button.member, this.guild);
    this.author = button.user
      ? (client.users.cache.get(button.user.id) as FireUser) ||
        new FireUser(client, button.user)
      : button.member &&
        ((client.users.cache.get(button.member.user.id) as FireUser) ||
          new FireUser(client, button.member.user));
    this.language = this.author?.settings.has("utils.language")
      ? this.author.language.id == "en-US" && this.guild?.language.id != "en-US"
        ? this.guild?.language
        : this.author.language
      : this.guild?.language || client.getLanguage("en-US");
    if (!this.guild) {
      this.channel = new FakeChannel(
        this,
        client,
        button.id,
        button.token,
        button.guildID ? null : this.author.dmChannel
      );
      return this;
    }
    this.channel = new FakeChannel(
      this,
      client,
      button.id,
      button.token,
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

  send(key: string = "", ...args: any[]) {
    return this.channel.send(this.language.get(key, ...args), {}, this.flags);
  }

  success(
    key: string = "",
    ...args: any[]
  ): Promise<ButtonMessage | MessageReaction | void> {
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
      `${emojis.success} ${this.language.get(key, ...args)}`,
      {},
      typeof this.flags == "number" ? this.flags : 64
    );
  }

  error(
    key: string = "",
    ...args: any[]
  ): Promise<ButtonMessage | MessageReaction | void> {
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
      `${emojis.error} ${this.language.get(key, ...args)}`,
      {},
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
        .get<DiscordAPIMessage>()
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
    content: string | MessageEditOptions | MessageEmbed | APIMessage,
    options?: WebhookEditMessageOptions & { embed?: MessageEmbed }
  ) {
    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embeds: [content],
      };
      content = null;
    }

    if (options?.embed) {
      options.embeds = [options.embed];
      delete options.embed;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(
        new Webhook(this.client, null), // needed to make isWebhook true for embeds array
        content as string,
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
  real: FireTextChannel | NewsChannel | DMChannel;
  messages: MessageManager;
  message: ButtonMessage;
  token: string;
  client: Fire;
  id: string;

  constructor(
    message: ButtonMessage,
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
    this.messages = real?.messages;
  }

  get flags() {
    return this.message.flags;
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

  awaitMessages(
    filter: CollectorFilter<[FireMessage]>,
    options?: AwaitMessagesOptions
  ) {
    return this.real?.awaitMessages(filter, options);
  }

  updateOverwrite(
    userOrRole: RoleResolvable | UserResolvable,
    options: PermissionOverwriteOptions,
    reason?: string
  ) {
    return !(this.real instanceof DMChannel)
      ? this.real?.updateOverwrite(userOrRole, options, { reason })
      : false;
  }

  createInvite(options?: InviteOptions) {
    return !(this.real instanceof DMChannel)
      ? this.real?.createInvite(options)
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

  async send(
    content: string | APIMessage | MessageEmbed,
    options?: WebhookMessageOptions & { embed?: MessageEmbed },
    flags?: number // Used for success/error, can also be set
  ): Promise<ButtonMessage> {
    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embeds: [content],
      };
      content = null;
    }

    if (options?.embed) {
      options.embeds = [options.embed];
      delete options.embed;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(
        new Webhook(this.client, null), // needed to make isWebhook true for embeds array
        content as string,
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
        .post<DiscordAPIMessage>({
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
    content: string | APIMessage | MessageEmbed,
    options?: WebhookMessageOptions & { embed?: MessageEmbed },
    flags?: number // Used for success/error, can also be set
  ): Promise<ButtonMessage> {
    if (this.message.sent) return; // can only update with initial response

    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embeds: [content],
      };
      content = null;
    }

    if (options?.embed) {
      options.embeds = [options.embed];
      delete options.embed;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(
        new Webhook(this.client, null), // needed to make isWebhook true for embeds array
        content as string,
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
