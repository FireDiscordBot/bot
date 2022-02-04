import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { Permissions } from "discord.js";

export default class Derank extends Command {
  constructor() {
    super("derank", {
      description: (language: Language) =>
        language.get("DERANK_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "user",
          type: "user|member",
          description: (language: Language) =>
            language.get("DERANK_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("DERANK_ARGUMENT_REASON_DESCRIPTION"),
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
    if (!args.user) return await command.error("DERANK_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(command.channel) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    const deranked = await args.user.derank(
      args.reason?.trim() ||
        (command.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      command.member,
      command.channel
    );
    if (deranked == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof deranked == "string")
      return await command.error(
        `DERANK_FAILED_${deranked.toUpperCase()}` as LanguageKeys
      );
  }
}
