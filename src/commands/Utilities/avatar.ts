import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
} from "discord.js";

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
    if (typeof user == "undefined") user = message.member ?? message.author;
    else if (!user) return;

    const color =
      user instanceof FireMember
        ? user?.displayColor
        : message.member?.displayColor;

    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setTitle(message.language.get("AVATAR_TITLE", { user: user.toString() }))
      .setImage(
        user?.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );

    let actionRow: MessageActionRow;
    if (
      message.guild &&
      user instanceof FireMember &&
      user.avatar &&
      user.avatar != user.user.avatar
    )
      actionRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setLabel(message.language.get("AVATAR_SWITCH_TO_GLOBAL"))
          .setStyle("PRIMARY")
          .setCustomId(`avatar:${user.id}:global:${message.author.id}`)
      );

    return await message.channel.send({
      embeds: [embed],
      components: actionRow ? [actionRow] : null,
    });
  }
}
