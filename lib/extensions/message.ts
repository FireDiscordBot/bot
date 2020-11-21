import {
  MessageReaction,
  TextChannel,
  NewsChannel,
  Structures,
  DMChannel,
  Message,
} from "discord.js";
import { PaginatorInterface } from "../util/paginators";
import { CommandUtil } from "../util/commandUtil";
import { constants } from "../util/constants";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";
import { APIMessage } from "discord.js";
import { MessageOptions } from "discord.js";
import { StringResolvable } from "discord.js";
import { MessageAdditions } from "discord.js";

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

  replyRaw(content: string): Promise<Message> {
    return (
      // @ts-ignore
      this.client.api
        // @ts-ignore
        .channels(this.channel.id)
        .messages.post({
          data: {
            content,
            message_reference: { message_id: this.id },
            allowed_mentions: this.client.options.allowedMentions,
          },
        })
        .then(
          // @ts-ignore
          (m: object) => this.client.actions.MessageCreate.handle(m).message
        )
        .catch(() => {
          return this.channel.send(content);
        })
    );
  }

  success(
    key: string = "",
    ...args: any[]
  ): Promise<MessageReaction | Message | void> {
    if (!key && this.deleted) return;
    return !key
      ? this.react(reactions.success).catch(() => {})
      : this.author.hasExperiment("MYT-k7UJ-XDwqH99A9yw6", 1) ||
        this.author.hasExperiment("MYT-k7UJ-XDwqH99A9yw6", 3)
      ? this.replyRaw(`${emojis.success} ${this.language.get(key, ...args)}`)
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
      : !this.author.hasExperiment("MYT-k7UJ-XDwqH99A9yw6", 4)
      ? this.replyRaw(`${emojis.error} ${this.language.get(key, ...args)}`)
      : this.channel.send(`${emojis.error} ${this.language.get(key, ...args)}`);
  }
}

Structures.extend("Message", () => FireMessage);
