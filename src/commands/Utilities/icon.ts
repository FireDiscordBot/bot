import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { FireUser } from "@fire/lib/extensions/user";
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
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser | null }
  ) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTimestamp()
      .setTitle(message.language.get("ICON_TITLE", message.guild.name))
      .setImage(
        message.guild?.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );

    return await message.channel.send(embed);
  }
}
