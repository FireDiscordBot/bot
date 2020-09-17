import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { GuildMember, User } from "discord.js";

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
          required: false,
        },
      ],
      category: "Utilities",
    });
  }

  async exec(message: FireMessage, args: { user: GuildMember | User | null }) {
    let user = args.user;
    if (!(user instanceof GuildMember || user instanceof User))
      return message.error("USER_NOT_FOUND");
    if (message.guild.member(user)) user = message.guild.member(user);
    const color =
      user instanceof GuildMember
        ? user?.displayColor
        : message.member?.displayColor || "#ffffff";
    if (user instanceof GuildMember) user = user.user;
    const embed = {
      color: color,
      timestamp: new Date(),
      image: {
        url: user?.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      },
    };
    await message.channel.send({ embed });
  }
}
