import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";
import { MessageEmbed } from "discord.js";

export default class extends Command {
  constructor() {
    super("ping", {
      description: (language: Language) =>
        language.get("PING_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
    });
  }

  async exec(message: FireMessage) {
    const m = await message.send("PING_INITIAL_MESSAGE");
    const embed = new MessageEmbed()
      .setTitle(
        `:ping_pong: ${
          m.createdTimestamp -
          (message.editedAt
            ? message.editedTimestamp
            : message.createdTimestamp)
        }ms.\n:heartpulse: ${this.client.ws.ping}ms.`
      )
      .setColor(message.member?.displayColor || "#ffffff")
      .setTimestamp(new Date());
    await m.edit({ content: null, embed });
  }
}
