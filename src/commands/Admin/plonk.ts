import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { GuildMember, User } from "discord.js";

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
          required: false,
        },
        {
          id: "reason",
          type: "string",
          default: "bad boi",
          match: "rest",
          required: false,
        },
      ],
      category: "Admin",
    });
  }

  condition(message: FireMessage) {
    return message.author.id in this.client.util.admins;
  }

  async exec(
    message: FireMessage,
    args: { user: GuildMember | User; permanent: boolean; reason: string }
  ) {
    const user = args.user instanceof GuildMember ? args.user.user : args.user;
    if (args.user.id in this.client.util.plonked) {
      const unblacklisted = await this.client.util.unblacklist(args.user);
      if (unblacklisted) return await message.success();
      else return await message.error();
    } else {
      const blacklisted = await this.client.util.blacklist(
        user,
        args.reason,
        args.permanent
      );
      if (blacklisted) return await message.success();
      else return await message.error();
    }
  }
}
