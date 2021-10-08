import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions, MessageActionRow, MessageButton } from "discord.js";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Avatar extends Command {
  constructor() {
    super("avatar", {
      description: (language: Language) =>
        language.get("AVATAR_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      aliases: ["av"],
      args: [
        {
          id: "user",
          type: "user|member",
          match: "rest",
          default: undefined,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser | null }
  ) {
    let user = args.user;
    if (typeof user == "undefined") user = message.member || message.author;
    else if (!user) return;

    const color =
      user instanceof FireMember
        ? user?.displayColor
        : message.member?.displayColor;

    const avatarURL = user?.displayAvatarURL({
      size: 2048,
      format: "png",
      dynamic: true,
    });

    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setTitle(message.language.get("AVATAR_TITLE", { user: user.toString() }))
      .setImage(avatarURL);

    return await message.channel.send({
      embeds: [embed],
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(message.language.get("OPEN_IN_BROWSER"))
            .setURL(avatarURL)
        ),
      ],
    });
  }
}
