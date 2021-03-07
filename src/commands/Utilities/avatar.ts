import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
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
      enableSlashCommand: true,
      restrictTo: "all",
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
        ? user?.displayHexColor
        : message.member?.displayHexColor || "#ffffff";

    if (user instanceof FireMember) user = user.user as FireUser;

    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setTitle(message.language.get("AVATAR_TITLE", user.toString()))
      .setImage(
        user?.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      );

    return await message.channel.send(embed);
  }
}
