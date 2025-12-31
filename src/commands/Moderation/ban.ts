import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { ParsedTime } from "@fire/src/arguments/time";
import { KeySupplier } from "discord-akairo";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
} from "discord.js";

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
          type: "time",
          description: (language: Language) =>
            language.get("BAN_ARGUMENT_TIME_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
        {
          id: "deleteMessageSeconds",
          type: "number",
          slashCommandType: "delete",
          description: (language: Language) =>
            language.get("BAN_ARGUMENT_DAYS_DESCRIPTION"),
          required: false,
          autocomplete: true,
          default: 0,
          match: "rest",
        },
      ],
      context: ["1225072261044764857"],
      enableSlashCommand: true,
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
      lock: ((
        command: ApplicationCommandMessage | ContextCommandMessage,
        args: {
          user: FireMember | FireUser;
          reason?: string;
          time?: string;
          days?: number;
        }
      ) => {
        if (command instanceof ApplicationCommandMessage && args.user)
          return args.user.id;
        else if (
          command instanceof ContextCommandMessage &&
          command.getMessage()
        )
          return command.getMessage(true).author.id;
        else return command.author.id;
      }) as unknown as KeySupplier,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    _: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    return [
      {
        name: interaction.language.get("BAN_DELETE_ARGUMENT_AUTOCOMPLETE.NONE"),
        value: 0,
      },
      {
        name: interaction.language.get(
          "BAN_DELETE_ARGUMENT_AUTOCOMPLETE.PREVIOUS_HOUR"
        ),
        value: 3_600,
      },
      {
        name: interaction.language.get(
          "BAN_DELETE_ARGUMENT_AUTOCOMPLETE.PREVIOUS_SIX_HOURS"
        ),
        value: 21_600,
      },
      {
        name: interaction.language.get(
          "BAN_DELETE_ARGUMENT_AUTOCOMPLETE.PREVIOUS_TWELVE_HOURS"
        ),
        value: 43_200,
      },
      {
        name: interaction.language.get(
          "BAN_DELETE_ARGUMENT_AUTOCOMPLETE.PREVIOUS_DAY"
        ),
        value: 86_400,
      },
      {
        name: interaction.language.get(
          "BAN_DELETE_ARGUMENT_AUTOCOMPLETE.PREVIOUS_THREE_DAYS"
        ),
        value: 259_200,
      },
      {
        name: interaction.language.get(
          "BAN_DELETE_ARGUMENT_AUTOCOMPLETE.PREVIOUS_WEEK"
        ),
        value: 604_800,
      },
    ];
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: {
      user: FireMember | FireUser;
      reason?: string;
      time?: ParsedTime;
      deleteMessageSeconds?: number;
    }
  ) {
    // Essential Discord has guild context commands for quick bans on automod flagged messages
    // due to insane amounts of spam bots
    if (command instanceof ContextCommandMessage) {
      if (command.getMessage().type != "AUTO_MODERATION_ACTION")
        return await command.error("BAN_CONTEXT_AUTOMOD_ONLY");
      args.user = command.getMessage().member ?? command.getMessage().author;
      args.reason = command.contextCommand.commandName.split("Ban - ")[1];
      args.deleteMessageSeconds = 7 * 24 * 60 * 60; // 7 days
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
    if (
      args.deleteMessageSeconds &&
      (args.deleteMessageSeconds < 1 || args.deleteMessageSeconds > 604_800)
    )
      return await command.error("BAN_INVALID_DAYS");
    const banUntil = args.time?.date;
    if (
      banUntil &&
      // 30 minute minimum ban time
      +banUntil - +new Date() < 1_800_000 &&
      !command.author.isSuperuser()
    )
      return await command.error("BAN_TIME_TOO_SHORT");
    else if (banUntil && args.user instanceof FireUser)
      return await command.error("BAN_MEMBER_REQUIRED");
    const beaned =
      args.user instanceof FireMember
        ? await args.user.bean(
            args.reason?.trim() ||
              (command.guild.language.get(
                "MODERATOR_ACTION_DEFAULT_REASON"
              ) as string),
            command.member,
            banUntil ? +banUntil : undefined,
            args.deleteMessageSeconds,
            command.channel
          )
        : await args.user.bean(
            command.guild,
            args.reason?.trim() ||
              (command.guild.language.get(
                "MODERATOR_ACTION_DEFAULT_REASON"
              ) as string),
            command.member,
            args.deleteMessageSeconds,
            command.channel
          );
    if (beaned == "FORBIDDEN")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof beaned == "string")
      return await command.error(`BAN_FAILED_${beaned}`);
  }
}
