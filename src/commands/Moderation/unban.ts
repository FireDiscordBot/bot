import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class Unban extends Command {
  constructor() {
    super("unban", {
      description: (language: Language) =>
        language.get("UNBAN_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.BanMembers],
      args: [
        {
          id: "user",
          type: "user",
          description: (language: Language) =>
            language.get("UNBAN_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: undefined,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("UNBAN_ARGUMENT_REASON_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireUser; reason?: string }
  ) {
    if (typeof args.user == "undefined")
      return await command.error("UNBAN_USER_REQUIRED");
    else if (!args.user) return;
    const unbanned = await command.guild.unban(
      args.user,
      args.reason?.trim() ||
        (command.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      command.member,
      command.channel
    );
    if (unbanned == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof unbanned == "string")
      return await command.error(
        `UNBAN_FAILED_${unbanned.toUpperCase()}` as LanguageKeys
      );
  }
}
