import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Command } from "@fire/lib/util/command";
import {
  ActionLogTypes,
  DEFAULT_ACTION_LOG_FLAGS,
  DEFAULT_MEMBER_LOG_FLAGS,
  DEFAULT_MOD_LOG_FLAGS,
  MemberLogTypes,
  ModLogTypes,
  titleCase,
} from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageActionRow, MessageSelectMenu } from "discord.js";

export default class LoggingConfig extends Command {
  constructor() {
    super("logging-configure", {
      description: (language: Language) =>
        language.get("LOGGING_CONFIG_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      args: [],
      enableSlashCommand: true,
      restrictTo: "guild",
      parent: "logging",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const components = [
      this.getModLogsSelect(command),
      this.getActionLogsSelect(command),
      this.getMemberLogsSelect(command),
    ] as MessageActionRow[];
    return await command.send("LOGGING_CONFIG_MESSAGE", { components });
  }

  getModLogsSelect(command: ApplicationCommandMessage | ComponentMessage) {
    if (!command.guild) return [];
    const options = [];
    const current = command.guild.settings.get(
      "logging.moderation.flags",
      DEFAULT_MOD_LOG_FLAGS
    );
    for (const [name, value] of Object.entries(ModLogTypes)) {
      if (typeof value != "number" || value == 0) continue;
      options.push({
        label: titleCase(name, name.includes("_") ? "_" : " "),
        value: name,
        default: (current & value) == value,
      });
    }
    return new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setPlaceholder(
          command.language.get("LOGGING_MODLOGS_SELECT_PLACEHOLDER")
        )
        .setCustomId("!logging-configure:moderation")
        .addOptions(options)
        .setMinValues(0)
        .setMaxValues(options.length)
    );
  }

  getActionLogsSelect(command: ApplicationCommandMessage | ComponentMessage) {
    if (!command.guild) return [];
    const options = [];
    const current = command.guild.settings.get(
      "logging.action.flags",
      DEFAULT_ACTION_LOG_FLAGS
    );
    for (const [name, value] of Object.entries(ActionLogTypes)) {
      if (typeof value != "number" || value == 0) continue;
      options.push({
        label: titleCase(name, name.includes("_") ? "_" : " "),
        value: name,
        default: (current & value) == value,
      });
    }
    return new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setPlaceholder(
          command.language.get("LOGGING_ACTIONLOGS_SELECT_PLACEHOLDER")
        )
        .setCustomId("!logging-configure:action")
        .addOptions(options)
        .setMinValues(0)
        .setMaxValues(options.length)
    );
  }

  getMemberLogsSelect(command: ApplicationCommandMessage | ComponentMessage) {
    if (!command.guild) return [];
    const options = [];
    const current = command.guild.settings.get(
      "logging.members.flags",
      DEFAULT_MEMBER_LOG_FLAGS
    );
    for (const [name, value] of Object.entries(MemberLogTypes)) {
      if (typeof value != "number" || value == 0) continue;
      options.push({
        label: titleCase(name, name.includes("_") ? "_" : " "),
        value: name,
        default: (current & value) == value,
      });
    }
    return new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setPlaceholder(
          command.language.get("LOGGING_MEMBERLOGS_SELECT_PLACEHOLDER")
        )
        .setCustomId("!logging-configure:members")
        .addOptions(options)
        .setMinValues(0)
        .setMaxValues(options.length)
    );
  }
}
