import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

export default class Avatar extends Command {
  constructor() {
    super("avatar", {
      description: (language: Language) =>
        language.get("AVATAR_COMMAND_DESCRIPTION"),
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

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser | null }
  ) {
    let user = args.user;
    if (typeof user == "undefined") user = command.member ?? command.author;
    else if (!user) return;

    const color =
      user instanceof FireMember
        ? user?.displayColor
        : command.member?.displayColor;

    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setTitle(command.language.get("AVATAR_TITLE", { user: user.toString() }))
      .setImage(
        user?.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );

    let actionRow: MessageActionRow;
    if (
      command.guild &&
      user instanceof FireMember &&
      user.avatar &&
      user.avatar != user.user.avatar
    )
      actionRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setLabel(command.language.get("AVATAR_SWITCH_TO_GLOBAL"))
          .setStyle("PRIMARY")
          .setCustomId(`avatar:${user.id}:global:${command.author.id}`)
      );

    return await command.channel.send({
      embeds: [embed],
      components: actionRow ? [actionRow] : null,
    });
  }
}
