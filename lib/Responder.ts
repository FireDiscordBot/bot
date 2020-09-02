import { Message } from "discord.js";
import { constants } from "./util/constants";

const { emojis, reactions } = constants;

export class Responder {
  message: Message;

  constructor(message: Message) {
    this.message = message;
  }

  success(key: string, ...args) {
    if (!key) return this.message.react(reactions.success);
    // return this.message.channel.send(
    //   `${emojis.success} ${this.message.language.get(key, ...args)}`
    // );
  }

  error(key: string, ...args) {
    if (!key) return this.message.react(reactions.error);
    // return this.message.channel.send(
    //   `${emojis.error} ${this.message.language.get(key, ...args)}`
    // );
  }

  // newError(key: string) {
  //   return this.message.channel.send(
  //     `${emojis.error} ${this.message.language.get(key)}`
  //   );
  // }
}
