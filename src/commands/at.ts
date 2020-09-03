import { constants } from "../../lib/util/constants";
import { Command } from "../../lib/util/command";
import { TextChannel } from "discord.js";
import { Message } from "discord.js";
const { emojis } = constants;

export default class extends Command {
  autotipChannel: TextChannel;
  constructor() {
    super("at", {
      aliases: ["autotip"],
      ownerOnly: true,
      description:
        "command that does autotip bot thing but not rn because I got banned",
      args: [
        {
          id: "content",
          type: "string",
          default: "/atstats",
        },
      ],
    });
  }

  async exec(message: Message, args: { content: string }) {
    if (!this.autotipChannel)
      return await message.channel.send(
        `${emojis.error} I could not find the autotip channel.`
      );
    this.autotipChannel.send(`|at ${args.content}`);
    this.autotipChannel
      .awaitMessages(
        (response: Message) => {
          return response.attachments.size == 1;
        },
        {
          max: 1,
          time: 15000,
          errors: ["time"],
        }
      )
      .then((collected) => {
        message.channel.send(collected.first().attachments.first());
      })
      .catch((err) => {
        message.channel.send(`${emojis.error} Got no response :(`);
      });
  }

  async init() {
    this.client.once("ready", () => {
      this.autotipChannel = this.client.channels.cache.get(
        "600068336331522079"
      ) as TextChannel;
    });
  }
}
