import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

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

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser | null }
  ) {
    let user = args.user;
    if (!(user instanceof FireMember || user instanceof FireUser))
      return await message.error("USER_NOT_FOUND");
    if (message.guild.member(user))
      user = message.guild.member(user) as FireMember;
    const color =
      user instanceof FireMember
        ? user?.displayColor
        : message.member?.displayColor || "#ffffff";
    if (user instanceof FireMember) user = user.user as FireUser;
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
