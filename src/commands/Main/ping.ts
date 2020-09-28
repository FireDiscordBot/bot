import { MessageEmbed } from "discord.js";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Ping extends Command {
  constructor() {
    super("ping", {
      description: (language: Language) =>
        language.get("PING_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
    });
  }

  async exec(message: FireMessage) {
    const pingMessage = await message.send("PING_INITIAL_MESSAGE");
    const embed = new MessageEmbed()
      .setTitle(
        `:ping_pong: ${
          pingMessage.createdTimestamp -
          (message.editedAt
            ? message.editedTimestamp || 0
            : message.createdTimestamp)
        }ms.\n:heartpulse: ${this.client.ws.ping}ms.`
      )
      .setColor(message.member?.displayColor || "#ffffff")
      .setTimestamp(new Date());

    await pingMessage.edit(message.language.get("PING_FINAL_MESSAGE"), embed);
  }
}
