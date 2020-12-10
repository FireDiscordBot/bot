import {
  APIMessageContentResolvable,
  GuildMemberResolvable,
  MessageEditOptions,
  MessageResolvable,
  MessageAttachment,
  StringResolvable,
  MessageAdditions,
  MessageMentions,
  RoleResolvable,
  MessageOptions,
  MessageManager,
  MessageEmbed,
  TextChannel,
  NewsChannel,
  APIMessage,
  Collection,
  Snowflake,
  Message,
} from "discord.js";
import { SlashCommand } from "../interfaces/slashCommands";
import { ArgumentOptions, Command } from "../util/command";
import { CommandUtil } from "../util/commandutil";
import { constants } from "../util/constants";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

const { emojis } = constants;

export class SlashCommandMessage {
  id: string;
  client: Fire;
  flags: number;
  sent: boolean;
  content: string;
  command: Command;
  guild: FireGuild;
  author: FireUser;
  util: CommandUtil;
  member: FireMember;
  language: Language;
  channel: FakeChannel;
  attachments: Collection<string, MessageAttachment>;
  mentions: MessageMentions;
  slashCommand: SlashCommand;
  realChannel: TextChannel | NewsChannel;

  constructor(client: Fire, command: SlashCommand) {
    this.client = client;
    this.id = command.id;
    this.slashCommand = command;
    this.command = this.client.getCommand(this.slashCommand.data.name);
    this.flags = 0;
    if (this.command?.ephemeral) this.setFlags(64);
    this.guild = client.guilds.cache.get(command.guild_id) as FireGuild;
    this.realChannel = this.guild.channels.cache.get(
      this.slashCommand.channel_id
    ) as TextChannel | NewsChannel;
    this.channel = new FakeChannel(
      this,
      client,
      command.id,
      command.token,
      this.realChannel,
      this.flags
    );
    // @ts-ignore
    this.mentions = new MessageMentions(this, [], [], false);
    this.attachments = new Collection();
    this.author =
      (client.users.cache.get(command.member.user.id) as FireUser) ||
      new FireUser(client, command.member.user);
    if (!client.users.cache.has(this.author.id))
      client.users.add(command.member.user);
    this.member =
      (this.guild.members.cache.get(this.author.id) as FireMember) ||
      new FireMember(client, command.member, this.guild);
    if (!this.guild.members.cache.has(this.member.id))
      this.guild.members.add(command.member);
    this.language = this.author?.settings.get("utils.language")
      ? this.author.language.id == "en-US" && this.guild?.language.id != "en-US"
        ? this.guild?.language
        : this.author.language
      : this.guild?.language || client.getLanguage("en-US");
    this.sent = false;
  }

  setFlags(flags: number) {
    // Suppress and ephemeral
    if (![1 << 2, 1 << 6].includes(flags)) return;
    this.flags = flags;
  }

  async generateContent() {
    let prefix = (this.client.commandHandler.prefix as (
      message: any
    ) => string | string[] | Promise<string | string[]>)(this);
    if (this.client.util.isPromise(prefix)) prefix = await prefix;
    if (prefix instanceof Array) prefix = prefix[0];
    let content = prefix as string;
    content += this.slashCommand.data.name + " ";
    if (this.command.args?.length && this.slashCommand.data.options?.length) {
      const argNames = (this.command.args as ArgumentOptions[]).map(
        (opt) => opt.id
      );
      const sortedArgs = this.slashCommand.data.options.sort(
        (a, b) =>
          argNames.indexOf(a.name.toLowerCase()) -
          argNames.indexOf(b.name.toLowerCase())
      );
      let args = sortedArgs.map((opt) => {
        if (
          (this.command.args as ArgumentOptions[]).find(
            (arg) => arg.id == opt.name && arg.flag && arg.match == "flag"
          )
        ) {
          const arg = (this.command.args as ArgumentOptions[]).find(
            (arg) => arg.id == opt.name
          );
          return arg.flag;
        } else if (
          (this.command.args as ArgumentOptions[]).find(
            (arg) => arg.id == opt.name && arg.flag
          )
        )
          return `--${opt.name} ${opt.value}`;
        return opt.value;
      });
      content += args.join(" ");
    }
    this.content = content;
    return this.content;
  }

  send(key: string = "", ...args: any[]) {
    return this.channel.send(this.language.get(key, ...args), {}, this.flags);
  }

  success(key: string = "", ...args: any[]): Promise<SlashCommandMessage> {
    if (!key) return;
    return this.channel.send(
      `${emojis.success} ${this.language.get(key, ...args)}`,
      {},
      this.flags ? this.flags : 64
    );
  }

  error(key: string = "", ...args: any[]): Promise<SlashCommandMessage> {
    if (!key) return;
    return this.channel.send(
      `${emojis.error} ${this.language.get(key, ...args)}`,
      {},
      this.flags ? this.flags : 64
    );
  }

  edit(
    content:
      | APIMessageContentResolvable
      | MessageEditOptions
      | MessageEmbed
      | APIMessage,
    options: MessageEditOptions | MessageEmbed
  ) {
    const { data } =
      content instanceof APIMessage
        ? content.resolveData()
        : // @ts-ignore
          APIMessage.create(this, content, options).resolveData();
    // @ts-ignore
    this.client.api
      // @ts-ignore
      .webhooks(this.id)(this.token)
      .messages("@original")
      .patch({
        data,
      })
      .catch(() => {});
    return this;
  }

  async delete() {
    return this;
  }
}

export class FakeChannel {
  id: string;
  client: Fire;
  token: string;
  msgFlags: number;
  messages: MessageManager;
  message: SlashCommandMessage;
  real: TextChannel | NewsChannel;

  constructor(
    message: SlashCommandMessage,
    client: Fire,
    id: string,
    token: string,
    real: TextChannel | NewsChannel,
    msgFlags?: number
  ) {
    this.id = id;
    this.real = real;
    this.token = token;
    this.client = client;
    this.message = message;
    this.msgFlags = msgFlags;
    this.messages = real.messages;
  }

  permissionsFor(memberOrRole: GuildMemberResolvable | RoleResolvable) {
    return this.real.permissionsFor(memberOrRole);
  }

  startTyping(count?: number) {
    return this.real.startTyping(count);
  }

  stopTyping(force?: boolean) {
    return this.real.stopTyping(force);
  }

  bulkDelete(
    messages:
      | Collection<Snowflake, Message>
      | readonly MessageResolvable[]
      | number,
    filterOld?: boolean
  ) {
    return this.real.bulkDelete(messages, filterOld);
  }

  // Acknowledges without sending a message
  async ack() {
    // @ts-ignore
    await this.client.api
      // @ts-ignore
      .interactions(this.id)(this.token)
      .callback.post({ data: { type: 5 } })
      .catch(() => {});
    this.message.sent = true;
  }

  async send(
    content: StringResolvable | APIMessage,
    options?: MessageOptions | MessageAdditions,
    flags?: number // Used for success/error, can also be set
  ): Promise<SlashCommandMessage> {
    let apiMessage: APIMessage;

    if (content instanceof APIMessage) content.resolveData();
    else {
      // @ts-ignore
      apiMessage = APIMessage.create(this, content, options).resolveData();
    }

    const { data, files } = await apiMessage.resolveFiles();

    // @ts-ignore
    data.flags = this.msgFlags;
    // @ts-ignore
    if (flags) data.flags = flags;

    if (!this.message.sent)
      // @ts-ignore
      await this.client.api
        // @ts-ignore
        .interactions(this.id)(this.token)
        .callback.post({
          data: {
            // @ts-ignore
            type: (data.flags & 64) == 64 && !data.embeds?.length ? 3 : 4,
            data,
          },
          files,
        })
        .then(() => (this.message.sent = true))
        .catch(() => {});
    else {
      // @ts-ignore
      await this.client.api
        // @ts-ignore
        .webhooks(this.id)(this.token)
        .messages.post({
          data: {
            // @ts-ignore
            type: (data.flags & 64) == 64 && !data.embeds?.length ? 3 : 4,
            data,
          },
          files,
        })
        .catch(() => {});
    }
    return this.message;
  }
}
