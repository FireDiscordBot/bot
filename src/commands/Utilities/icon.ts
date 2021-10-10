import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Icon extends Command {
  constructor() {
    super("icon", {
      description: (language: Language) =>
        language.get("ICON_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setTitle(
        command.language.get("ICON_TITLE", { guild: command.guild.name })
      )
      .setImage(
        command.guild?.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );

    return await command.channel.send({ embeds: [embed] });
  }
}
