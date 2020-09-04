import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";
import { TextChannel } from "discord.js";

export default class extends Command {
  autotipChannel: TextChannel;
  constructor() {
    super("at", {
      aliases: ["autotip"],
      ownerOnly: true,
      description: (language: Language) =>
        language.get("AUTODECANCER_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "content",
          type: "string",
          default: "/atstats",
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { content: string }) {
    if (!this.autotipChannel)
      return await message.error("AT_CHANNEL_NOT_FOUND");
    this.autotipChannel.send(`|at ${args.content}`);
    this.autotipChannel
      .awaitMessages(
        (response: FireMessage) => {
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
        message.error("AT_NO_RESPONSE");
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
