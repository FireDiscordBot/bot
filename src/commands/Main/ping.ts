import { MessageEmbed } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Ping extends Command {
  constructor() {
    super("ping", {
      description: (language: Language) =>
        language.get("PING_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage) {
    const pingMessage = (await message.send(
      "PING_INITIAL_MESSAGE"
    )) as FireMessage;
    const embed = new MessageEmbed()
      .setTitle(
        `:ping_pong: ${
          pingMessage.createdTimestamp -
          (message.editedAt
            ? message.editedTimestamp || 0
            : message.createdTimestamp)
        }ms.\n:heartpulse: ${
          this.client.ws.shards.get(message.guild ? message.guild.shardID : 0)
            .ping
        }ms.`
      )
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setFooter(
        message.language.get(
          "PING_FOOTER",
          message.guild ? message.guild.shardID : 0,
          this.client.manager.id
        )
      )
      .setTimestamp();
    message.delete();
    return await message.reply(embed);
  }
}
