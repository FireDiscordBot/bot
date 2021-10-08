import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions, MessageActionRow, MessageButton } from "discord.js";
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
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser | null }
  ) {
    const iconURL = message.guild?.iconURL({
      size: 2048,
      format: "png",
      dynamic: true,
    });

    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setTitle(
        message.language.get("ICON_TITLE", { guild: message.guild.name })
      )
      .setImage(iconURL);

    return await message.channel.send({
      embeds: [embed],
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(message.language.get("OPEN_IN_BROWSER"))
            .setURL(iconURL)
        ),
      ],
    });
  }
}
