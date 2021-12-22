import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Unban extends Command {
  constructor() {
    super("unban", {
      description: (language: Language) =>
        language.get("UNBAN_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      clientPermissions: [Permissions.FLAGS.BAN_MEMBERS],
      args: [
        {
          id: "user",
          type: "user",
          required: true,
          default: undefined,
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
    if (typeof args.user == "undefined")
      return await message.error("UNBAN_USER_REQUIRED");
    else if (!args.user) return;
    await message.delete().catch(() => {});
    const unbanned = await message.guild.unban(
      args.user,
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      message.channel as FireTextChannel
    );
    if (unbanned == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof unbanned == "string")
      return await message.error(
        (`UNBAN_FAILED_${unbanned.toUpperCase()}` as unknown) as LanguageKeys
      );
  }
}
