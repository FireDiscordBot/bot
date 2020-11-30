import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";

export default class Avatar extends Command {
  constructor() {
    super("avatar", {
      description: (language: Language) =>
        language.get("AVATAR_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
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
      restrictTo: "all",
    });
  }

  exec(message: FireMessage, args: { user: FireMember | FireUser | null }) {
    let user = args.user;
    if (typeof user == "undefined") user = message.member || message.author;
    else if (!user) return;

    const color =
      user instanceof FireMember
        ? user?.displayColor
        : message.member?.displayColor || "#ffffff";

    if (user instanceof FireMember) user = user.user as FireUser;

    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp(new Date())
      .setImage(
        user?.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );

    return message.channel.send(embed);
  }
}
