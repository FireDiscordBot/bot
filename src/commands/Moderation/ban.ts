import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { parseTime } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class Ban extends Command {
  constructor() {
    super("ban", {
      description: (language: Language) =>
        language.get("BAN_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.BanMembers],
      args: [
        {
          id: "user",
          type: "user|member",
          description: (language: Language) =>
            language.get("BAN_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("BAN_ARGUMENT_REASON_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
        {
          id: "time",
          type: "string",
          description: (language: Language) =>
            language.get("BAN_ARGUMENT_TIME_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
        {
          id: "days",
          type: "number",
          description: (language: Language) =>
            language.get("BAN_ARGUMENT_DAYS_DESCRIPTION"),
          required: false,
          default: 0,
          match: "rest",
          // TODO: add min/max to this
        },
      ],
      context: ["1225072261044764857"],
      enableSlashCommand: true,
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
      lock: (
        _,
        args: {
          user: FireMember | FireUser;
          reason?: string;
          time?: string;
          days?: number;
        }
      ) => args.user.id,
    });
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: {
      user: FireMember | FireUser;
      reason?: string;
      time?: string;
      days?: number;
    }
  ) {
    // Essential Discord has guild context commands for quick bans on automod flagged messages
    // due to insane amounts of spam bots
    if (command instanceof ContextCommandMessage) {
      if (command.getMessage().type != "AUTO_MODERATION_ACTION")
        return await command.error("BAN_CONTEXT_AUTOMOD_ONLY");
      args.user = command.getMessage().member ?? command.getMessage().author;
      args.reason = command.contextCommand.commandName.split("Ban - ")[1];
      args.days = 7;
    }

    if (typeof args.user == "undefined")
      return await command.error("BAN_USER_REQUIRED");
    else if (!args.user) return;
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(command.channel) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    if (args.days && (args.days < 1 || args.days > 7))
      return await command.error("BAN_INVALID_DAYS");
    let minutes: number;
    try {
      minutes = parseTime(args.time) as number;
    } catch {
      return await command.error("TIME_PARSING_FAILED");
    }
    if (minutes != 0 && minutes < 30 && !command.author.isSuperuser())
      return await command.error("BAN_TIME_TOO_SHORT");
    else if (minutes && args.user instanceof FireUser)
      return await command.error("BAN_MEMBER_REQUIRED");
    const now = new Date();
    let date: number;
    if (minutes) date = now.setMinutes(now.getMinutes() + minutes);
    const beaned =
      args.user instanceof FireMember
        ? await args.user.bean(
            args.reason?.trim() ||
              (command.guild.language.get(
                "MODERATOR_ACTION_DEFAULT_REASON"
              ) as string),
            command.member,
            date,
            args.days,
            command.channel
          )
        : await args.user.bean(
            command.guild,
            args.reason?.trim() ||
              (command.guild.language.get(
                "MODERATOR_ACTION_DEFAULT_REASON"
              ) as string),
            command.member,
            args.days,
            command.channel
          );
    if (beaned == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof beaned == "string")
      return await command.error(
        `BAN_FAILED_${beaned.toUpperCase()}` as LanguageKeys
      );
  }
}
