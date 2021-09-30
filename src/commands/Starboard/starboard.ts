import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Starboard extends Command {
  constructor() {
    super("starboard", {
      description: (language: Language) =>
        language.get("STARBOARD_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "action",
          type: "string",
          match: "phrase",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      group: true,
    });
  }

  async exec(message: FireMessage, args: { action?: string }) {
    if (this.getChildren().includes(`starboard-${args.action}`)) {
      message.content = message.content.replace(
        `${message.util?.parsed?.alias || "starboard"} ${args.action}`,
        `starboard-${args.action}`
      );
      return await this.client.commandHandler.handle(message);
    } else return await this.sendDefaultMessage(message);
  }

  async sendDefaultMessage(message: FireMessage) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(message.language.get("STARBOARD_MAIN_DESCRIPTION"))
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .addField(
        `${message.util.parsed?.prefix}starboard channel [<channel>]`,
        message.language.get("STARBOARD_CHANNEL_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}starboard minimum <number>`,
        message.language.get("STARBOARD_MINIMUM_DESCRIPTION")
      )
      .addField(
        // for now, this will be a premium perk but I am open to changing it
        `${message.util.parsed?.prefix}starboard emoji [<emoji>]`,
        message.language.get("STARBOARD_EMOJI_DESCRIPTION")
      );
    return await message.channel.send({ embeds: [embed] });
  }
}
