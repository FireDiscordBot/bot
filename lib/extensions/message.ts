import {
  Structures,
  Message,
  TextChannel,
  NewsChannel,
  DMChannel,
} from "discord.js";
import { Fire } from "../Fire";
import { Language } from "../util/language";
import { constants } from "../util/constants";

const { emojis, reactions } = constants;

export class FireMessage extends Message {
  language: Language;
  constructor(
    client: Fire,
    data: object,
    channel: DMChannel | TextChannel | NewsChannel
  ) {
    super(client, data, channel);
    this.language = client.languages.modules.get(
      client.settings.get(this.guild.id, "util.language", "en-US")
    ) as Language;
  }

  send(key: string, ...args: any[]) {
    return this.channel.send(`${this.language.get(key, ...args)}`);
  }

  success(key: string, ...args: any[]) {
    if (!key) return this.react(reactions.success);
    return this.channel.send(
      `${emojis.success} ${this.language.get(key, ...args)}`
    );
  }

  error(key: string, ...args: any[]) {
    if (!key) return this.react(reactions.error);
    return this.channel.send(
      `${emojis.error} ${this.language.get(key, ...args)}`
    );
  }
}

Structures.extend("Message", () => {
  return FireMessage;
});
