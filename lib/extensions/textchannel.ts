import {
  APIMessageContentResolvable,
  StringResolvable,
  MessageAdditions,
  MessageOptions,
  SplitOptions,
  TextChannel,
  Structures,
  APIMessage,
} from "discord.js";
import { FireMessage } from "./message";
import { FireGuild } from "./guild";
import { Fire } from "../Fire";

export class FireTextChannel extends TextChannel {
  guild: FireGuild;
  client: Fire;

  constructor(guild: FireGuild, data?: object) {
    super(guild, data);
  }

  // @ts-ignore
  async send(
    content:
      | APIMessageContentResolvable
      | (MessageOptions & { split?: false })
      | MessageAdditions
  ): Promise<FireMessage>;
  async send(
    options: MessageOptions & { split: true | SplitOptions }
  ): Promise<FireMessage[]>;
  async send(
    options: MessageOptions | APIMessage
  ): Promise<FireMessage | FireMessage[]>;
  async send(
    content: StringResolvable,
    options: (MessageOptions & { split?: false }) | MessageAdditions
  ): Promise<FireMessage>;
  async send(
    content: StringResolvable,
    options: MessageOptions & { split: true | SplitOptions }
  ): Promise<FireMessage[]>;
  async send(
    content: StringResolvable,
    options: MessageOptions
  ): Promise<FireMessage | FireMessage[]> {
    let error: Error;
    const start = +new Date();
    // @ts-ignore
    const message = await super.send(content, options).catch((e) => {
      error = e;
      return {};
    });
    this.client.restPing = +new Date() - start;
    if (error) throw error;
    return message as FireMessage;
  }
}

Structures.extend("TextChannel", () => FireTextChannel);
