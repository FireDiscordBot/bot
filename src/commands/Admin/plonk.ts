import { GuildMember, User } from "discord.js";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { booleanTypeCaster } from "../../arguments/boolean";
import { FireMember } from "../../../lib/extensions/guildmember";
import { FireUser } from "../../../lib/extensions/user";

export default class Plonk extends Command {
  constructor() {
    super("plonk", {
      description: (language: Language) =>
        language.get("PLONK_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
        },
        {
          id: "permanent",
          type: "boolean",
          default: true,
        },
        {
          id: "reason",
          type: "string",
          default: "bad boi",
          match: "rest",
        },
      ],
      aliases: ["unplonk"],
      hidden: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser; permanent: boolean; reason: string }
  ) {
    if (
      !this.client.util.admins.includes(message.author.id) ||
      this.client.util.admins.includes(args.user.id)
    )
      return;

    const user = args.user instanceof FireMember ? args.user.user : args.user;
    if (!user) return;

    if (this.client.util.plonked.includes(user.id)) {
      const unblacklisted = await this.client.util.unblacklist(user);
      return unblacklisted ? await message.success() : await message.error();
    } else {
      const blacklisted = await this.client.util.blacklist(
        user,
        args.reason,
        args.permanent
      );
      return blacklisted ? await message.success() : await message.error();
    }
  }
}
