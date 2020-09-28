import {
  Structures,
  Message,
  TextChannel,
  NewsChannel,
  DMChannel,
  MessageReaction,
} from "discord.js";
import { Fire } from "../Fire";
import { Language } from "../util/language";
import { constants } from "../util/constants";
import { FireMember } from "./guildmember";
import { FireGuild } from "./guild";
import { FireUser } from "./user";

const { emojis, reactions } = constants;

export class FireMessage extends Message {
  client: Fire;
  language: Language;
  guild: FireGuild;
  member: FireMember;
  author: FireUser;

  constructor(
    client: Fire,
    data: object,
    channel: DMChannel | TextChannel | NewsChannel
  ) {
    super(client, data, channel);
    this.language = client.languages.modules?.get(
      client.settings?.get(this.guild.id, "utils.language", "en-US")
    ) as Language;
  }

  send(key: string = "", ...args: any[]) {
    return this.channel.send(this.language.get(key, ...args));
  }

  success(
    key: string = "",
    ...args: any[]
  ): Promise<MessageReaction | Message> {
    return !key
      ? this.react(reactions.success)
      : this.channel.send(
          `${emojis.success} ${this.language.get(key, ...args)}`
        );
  }

  error(key: string = "", ...args: any[]): Promise<MessageReaction | Message> {
    return !key
      ? this.react(reactions.error)
      : this.channel.send(`${emojis.error} ${this.language.get(key, ...args)}`);
  }
}

Structures.extend("Message", () => FireMessage);
