import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";

export default class Warn extends Command {
  constructor() {
    super("warn", {
      description: (language: Language) =>
        language.get("WARN_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "member",
          description: (language: Language) =>
            language.get("WARN_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("WARN_ARGUMENT_REASON_DESCRIPTION"),
          required: true,
          default: null,
          match: "rest",
        },
      ],
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember; reason: string }
  ) {
    if (!args.user) return;
    else if (
      (args.user.isModerator(command.channel) || args.user.user.bot) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    if (!args.reason) return await command.error("WARN_REASON_MISSING");
    const warned = await args.user.warn(
      args.reason,
      command.member,
      command.channel
    );
    if (warned == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof warned == "string")
      return await command.error(
        `WARN_FAILED_${warned.toUpperCase()}` as LanguageKeys
      );
  }
}
