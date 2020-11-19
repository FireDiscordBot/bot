import {
  Structures,
  Message,
  TextChannel,
  NewsChannel,
  DMChannel,
  MessageReaction,
} from "discord.js";
import { PaginatorInterface } from "../util/paginators";
import { CommandUtil } from "../util/commandUtil";
import { constants } from "../util/constants";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

const { emojis, reactions } = constants;

export class FireMessage extends Message {
  client: Fire;
  language: Language;
  guild: FireGuild;
  member: FireMember | null;
  author: FireUser;
  util?: CommandUtil;
  paginator?: PaginatorInterface;

  constructor(
    client: Fire,
    data: object,
    channel: DMChannel | TextChannel | NewsChannel
  ) {
    super(client, data, channel);
    this.language = this.author?.settings.get("utils.language")
      ? this.author.language.id == "en-US" && this.guild?.language.id != "en-US"
        ? this.guild?.language
        : this.author.language
      : this.guild?.language || client.getLanguage("en-US");
  }

  send(key: string = "", ...args: any[]) {
    return this.channel.send(this.language.get(key, ...args));
  }

  success(
    key: string = "",
    ...args: any[]
  ): Promise<MessageReaction | Message | void> {
    if (!key && this.deleted) return;
    return !key
      ? this.react(reactions.success).catch(() => {})
      : this.channel.send(
          `${emojis.success} ${this.language.get(key, ...args)}`
        );
  }

  error(
    key: string = "",
    ...args: any[]
  ): Promise<MessageReaction | Message | void> {
    if (!key && this.deleted) return;
    return !key
      ? this.react(reactions.error).catch(() => {})
      : this.channel.send(`${emojis.error} ${this.language.get(key, ...args)}`);
  }
}

Structures.extend("Message", () => FireMessage);
