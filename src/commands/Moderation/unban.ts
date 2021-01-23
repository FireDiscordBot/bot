import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";

export default class Unban extends Command {
  constructor() {
    super("unban", {
      description: (language: Language) =>
        language.get("UNBAN_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "user",
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          required: false,
          default: null,
          match: "rest",
        },
      ],
      aliases: ["unbanish"],
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(message: FireMessage, args: { user: FireUser; reason?: string }) {
    if (!args.user) return await message.error("UNBAN_USER_REQUIRED");
    await message.delete().catch(() => {});
    const unbanned = await message.guild.unban(
      args.user,
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      message.channel as TextChannel
    );
    if (unbanned == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof unbanned == "string")
      return await message.error(`UNBAN_FAILED_${unbanned.toUpperCase()}`);
  }
}
