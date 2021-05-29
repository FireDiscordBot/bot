import {
  APIMessageContentResolvable,
  PermissionOverwriteOptions,
  EmojiIdentifierResolvable,
  DeconstructedSnowflake,
  GuildMemberResolvable,
  AwaitMessagesOptions,
  MessageEditOptions,
  MessageResolvable,
  StringResolvable,
  MessageAdditions,
  MessageReaction,
  CollectorFilter,
  MessageOptions,
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
} from "discord.js";
import {
  APIComponent,
  Interaction,
  ButtonType,
  Button,
  ActionRow,
} from "../interfaces/interactions";
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
export type EphemeralMessage = { id: string; flags: number };

export class ButtonMessage {
  realChannel?: FireTextChannel | NewsChannel | DMChannel;
  private snowflake: DeconstructedSnowflake;
  message: FireMessage | EphemeralMessage;
  sent: false | "ack" | "message";
  sourceMessage: FireMessage;
  private _flags: number;
  latestResponse: string;
  channel: FakeChannel;
  ephemeral: boolean;
  member: FireMember;
  language: Language;
  custom_id: string;
  guild: FireGuild;
  author: FireUser;
  button: Button;
  client: Fire;
  id: string;

  constructor(client: Fire, button: Interaction) {
    if (button.type != 3) throw new TypeError("Interaction is not Button");
    this.client = client;
    this.id = button.id;
    this.snowflake = SnowflakeUtil.deconstruct(this.id);
    this.custom_id = button.data.custom_id;
    this.button = button;
    this.sent = false;
    this.guild = client.guilds.cache.get(button.guild_id) as FireGuild;
    this.realChannel = client.channels.cache.get(button.channel_id) as
      | FireTextChannel
      | NewsChannel
      | DMChannel;
    this.ephemeral = (button.message.flags & 64) != 0;
    this.message = this.ephemeral
      ? (button.message as EphemeralMessage)
      : (this.realChannel.messages.cache.get(
          button.message?.id
        ) as FireMessage) ||
        new FireMessage(client, button.message, this.realChannel);
    if (
      !this.message ||
      (!this.ephemeral &&
        !this.button.message.components?.find(
          (component) =>
            (component.type == this.button.data.component_type &&
              // @ts-ignore
              component.custom_id == this.custom_id) ||
            (component.type == ButtonType.ACTION_ROW &&
              component.components.find(
                (component) =>
                  component.type == this.button.data.component_type &&
                  // @ts-ignore
                  component.custom_id == this.custom_id
              ))
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
        button.guild_id ? null : this.author.dmChannel
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

  // temp helper function
  static async sendWithButtons(
    channel: FireTextChannel | NewsChannel | DMChannel | FireMessage,
    content: StringResolvable | APIMessage | MessageEmbed,
    options?: (MessageOptions | MessageAdditions) & {
      buttons?: APIComponent[];
    }
  ): Promise<FireMessage> {
    if (channel instanceof FireMessage) channel = channel.channel;
    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embed: content,
      };
      content = null;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(channel, content, options).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    const isRow =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.ACTION_ROW
      );
    const isButtons =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.BUTTON
      );

    if (isRow) data.components = options.buttons;
    else if (isButtons)
      data.components = [
        { type: ButtonType.ACTION_ROW, components: options.buttons },
      ];

    return await (channel.client as Fire).req
      .channels(channel.id)
      .messages.post<DiscordAPIMessage>({ data, files })
      .then(
        (d) =>
          // @ts-ignore
          channel.client.actions.MessageCreate.handle(d).message as FireMessage
      );
  }

  // temp helper function
  static async editWithButtons(
    message: FireMessage,
    content: StringResolvable | APIMessage | MessageEmbed,
    options?: (MessageOptions | MessageAdditions) & {
      buttons?: ActionRow[] | APIComponent[];
    }
  ) {
    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embed: content,
      };
      content = null;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(
        message.channel,
        content,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    const isRow =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.ACTION_ROW
      );
    const isButtons =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.BUTTON
      );

    if (isRow) data.components = options.buttons;
    else if (isButtons)
      data.components = [{ type: 1, components: options.buttons }];
    else if (options?.buttons == null) data.components = [];

    return await (message.client as Fire).req
      .channels(message.channel.id)
      .messages(message.id)
      .patch<DiscordAPIMessage>({ data, files })
      .then((d) => {
        // @ts-ignore
        const clone = message._clone();
        clone._patch(d);
        return clone as FireMessage;
      })
      .catch(() => {});
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
        .webhooks(this.client.user.id, this.button.token)
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
    content:
      | APIMessageContentResolvable
      | MessageEditOptions
      | MessageEmbed
      | APIMessage,
    options?: (MessageEditOptions | MessageEmbed) & {
      buttons?: APIComponent[];
    }
  ) {
    const { data } = (content instanceof APIMessage
      ? content.resolveData()
      : // @ts-ignore
        APIMessage.create(this, content, options).resolveData()) as {
      data: any;
      files: any[];
    };

    data.flags = this.flags;

    const isRow =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.ACTION_ROW
      );
    const isButtons =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.BUTTON
      );

    if (isRow) data.components = options.buttons;
    else if (isButtons)
      data.components = [{ type: 1, components: options.buttons }];
    else if (options?.buttons == null) data.components = [];

    await this.client.req
      .webhooks(this.client.user.id, this.button.token)
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
      .webhooks(this.client.user.id, this.button.token)
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
    content: StringResolvable | APIMessage | MessageEmbed,
    options?: (MessageOptions | MessageAdditions) & {
      buttons?: APIComponent[];
    },
    flags?: number // Used for success/error, can also be set
  ): Promise<ButtonMessage> {
    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embed: content,
      };
      content = null;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(
        // @ts-ignore
        { client: this.client },
        content,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    const isRow =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.ACTION_ROW
      );
    const isButtons =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.BUTTON
      );

    if (isRow) data.components = options.buttons;
    else if (isButtons)
      data.components = [
        { type: ButtonType.ACTION_ROW, components: options.buttons },
      ];

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
          this.message.latestResponse = "@original";
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
      else this.message.latestResponse = "@original";
    }
    this.message.getRealMessage().catch(() => {});
    return this.message;
  }

  async update(
    content: StringResolvable | APIMessage | MessageEmbed,
    options?: (MessageOptions | MessageAdditions) & {
      buttons?: APIComponent[];
    },
    flags?: number // Used for success/error, can also be set
  ): Promise<ButtonMessage> {
    if (this.message.sent) return; // can only update with initial response

    let apiMessage: APIMessage;

    if (content instanceof MessageEmbed) {
      options = {
        ...options,
        embed: content,
      };
      content = null;
    }

    if (content instanceof APIMessage) apiMessage = content.resolveData();
    else {
      apiMessage = APIMessage.create(
        // @ts-ignore
        { client: this.client },
        content,
        options
      ).resolveData();
    }

    const { data, files } = (await apiMessage.resolveFiles()) as {
      data: any;
      files: any[];
    };

    const isRow =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.ACTION_ROW
      );
    const isButtons =
      options?.buttons?.length &&
      options?.buttons.every(
        (component) => component.type == ButtonType.BUTTON
      );

    if (isRow) data.components = options.buttons;
    else if (isButtons)
      data.components = [
        { type: ButtonType.ACTION_ROW, components: options.buttons },
      ];
    else if (options?.buttons == null) data.components = [];

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
        this.message.latestResponse = "@original";
      })
      .catch(() => {});
    this.message.getRealMessage().catch(() => {});
    return this.message;
  }
}
