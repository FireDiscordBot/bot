import {
  AutocompleteInteraction,
  CommandInteractionOption,
  Permissions,
} from "discord.js";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const valid = ["everyone", "zws", "spoiler", "selfbot"];

export default class Anti extends Command {
  constructor() {
    super("anti", {
      description: (language: Language) =>
        language.get("ANTI_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      args: [
        {
          id: "anti",
          type: "string",
          autocomplete: true,
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async autocomplete() {
    // allows it to be immediately updated rather than waiting for the command to propogate
    return valid;
  }

  // todo: make "ui" with components rather than using an argument
  async run(
    command: ApplicationCommandMessage,
    args: { anti?: "everyone" | "zws" | "spoiler" | "selfbot" }
  ) {
    if (!args.anti) {
      const options = {
        [command.language.get("ANTI_EVERYONE") as string]:
          command.guild.settings.get<boolean>("mod.antieveryone", false),
        [command.language.get("ANTI_ZWS") as string]:
          command.guild.settings.get<boolean>("mod.antizws", false),
        [command.language.get("ANTI_SPOILER") as string]:
          command.guild.settings.get<boolean>("mod.antispoilers", false),
        [command.language.get("ANTI_SELFBOT") as string]:
          command.guild.settings.get<boolean>("mod.antiselfbot", false),
      };
      return await command.send("ANTI_CURRENT_OPTIONS", {
        filters: Object.entries(options)
          .map(([name, enabled]) =>
            enabled
              ? `${constants.emojis.success} ${name}`
              : `${constants.emojis.error} ${name}`
          )
          .join("\n"),
      });
    }

    // there will be more added as time goes on
    // so use a switch from the get go
    switch (args.anti) {
      case "everyone": {
        const current = command.guild.settings.get<boolean>(
          "mod.antieveryone",
          false
        );
        command.guild.settings.set<boolean>("mod.antieveryone", !current);
        return current
          ? await command.success("ANTI_EVERYONE_DISABLED")
          : await command.success("ANTI_EVERYONE_ENABLED");
      }
      case "zws": {
        const current = command.guild.settings.get<boolean>(
          "mod.antizws",
          false
        );
        command.guild.settings.set<boolean>("mod.antizws", !current);
        return current
          ? await command.success("ANTI_ZWS_DISABLED")
          : await command.success("ANTI_ZWS_ENABLED");
      }
      case "spoiler": {
        const current = command.guild.settings.get<boolean>(
          "mod.antispoilers",
          false
        );
        command.guild.settings.set<boolean>("mod.antispoilers", !current);
        return current
          ? await command.success("ANTI_SPOILER_DISABLED")
          : await command.success("ANTI_SPOILER_ENABLED");
      }
      case "selfbot": {
        const current = command.guild.settings.get<boolean>(
          "mod.antiselfbot",
          false
        );
        command.guild.settings.set<boolean>("mod.antiselfbot", !current);
        return current
          ? await command.success("ANTI_SELFBOT_DISABLED")
          : await command.success("ANTI_SELFBOT_ENABLED");
      }
      default: {
        return await command.error("ANTI_UNKNOWN", { valid: valid.join(", ") });
      }
    }
  }
}
