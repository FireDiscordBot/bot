import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageEmbed, Permissions } from "discord.js";
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

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser | null }
  ) {
    let user = args.user;
    if (typeof user == "undefined") user = command.member || command.author;
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

    return await command.channel.send({ embeds: [embed] });
  }
}
