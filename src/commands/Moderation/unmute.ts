import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Unmute extends Command {
  constructor() {
    super("unmute", {
      description: (language: Language) =>
        language.get("UNMUTE_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "user",
          type: "memberSilent",
          description: (language: Language) =>
            language.get("UNMUTE_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("UNMUTE_ARGUMENT_REASON_DESCRIPTION"),
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
    args: { user: FireMember; reason?: string }
  ) {
    if (!args.user) return await command.error("UNMUTE_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(command.channel) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    const unmuted = await args.user.unmute(
      args.reason?.trim() ||
        (command.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      command.member,
      command.channel
    );
    if (unmuted == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof unmuted == "string")
      return await command.error(
        `UNMUTE_FAILED_${unmuted.toUpperCase()}` as LanguageKeys
      );
  }
}
