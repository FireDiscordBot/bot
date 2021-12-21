import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { parseTime } from "@fire/lib/util/constants";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Mute extends Command {
  constructor() {
    super("mute", {
      description: (language: Language) =>
        language.get("MUTE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          type: "memberSilent",
          description: (language: Language) =>
            language.get("MUTE_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("MUTE_ARGUMENT_REASON_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
        {
          id: "time",
          type: "string",
          description: (language: Language) =>
            language.get("MUTE_ARGUMENT_TIME_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
      ],
      clientPermissions: [
        // Permissions.FLAGS.SEND_MESSAGES_IN_THREADS,
        // Permissions.FLAGS.CREATE_PRIVATE_THREADS,
        // Permissions.FLAGS.CREATE_PUBLIC_THREADS,
        // Permissions.FLAGS.REQUEST_TO_SPEAK,
        Permissions.FLAGS.MANAGE_CHANNELS,
        // Permissions.FLAGS.SEND_MESSAGES,
        // Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.MANAGE_ROLES,
        // Permissions.FLAGS.SPEAK,
      ],
      aliases: ["silence", "tempmute", "403"],
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
    args: { user: FireMember; reason?: string; time?: string }
  ) {
    if (!args.user) return await command.error("MUTE_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      (args.user.isModerator(command.channel) || args.user.user.bot) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    let minutes: number;
    try {
      minutes = parseTime(args.time) as number;
    } catch {
      return await command.error("MUTE_FAILED_PARSE_TIME");
    }
    const now = new Date();
    let date: number;
    if (minutes) date = now.setMinutes(now.getMinutes() + minutes);
    const muted = await args.user.mute(
      args.reason ||
        (command.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      command.member,
      date,
      command.channel
    );
    if (muted == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof muted == "string")
      return await command.error(
        `MUTE_FAILED_${muted.toUpperCase()}` as LanguageKeys
      );
  }
}
