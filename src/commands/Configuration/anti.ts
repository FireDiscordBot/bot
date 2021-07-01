import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

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
          slashCommandOptions: valid,
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: { anti?: "everyone" | "zws" | "spoiler" | "selfbot" }
  ) {
    if (!args.anti) {
      const options = {
        [message.language.get(
          "ANTI_EVERYONE"
        ) as string]: message.guild.settings.get<boolean>(
          "mod.antieveryone",
          false
        ),
        [message.language.get(
          "ANTI_ZWS"
        ) as string]: message.guild.settings.get<boolean>("mod.antizws", false),
        [message.language.get(
          "ANTI_SPOILER"
        ) as string]: message.guild.settings.get<boolean>(
          "mod.antispoilers",
          false
        ),
        [message.language.get(
          "ANTI_SELFBOT"
        ) as string]: message.guild.settings.get<boolean>(
          "mod.antiselfbot",
          false
        ),
      };
      return await message.send("ANTI_CURRENT_OPTIONS", {
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
        const current = message.guild.settings.get<boolean>(
          "mod.antieveryone",
          false
        );
        message.guild.settings.set<boolean>("mod.antieveryone", !current);
        return current
          ? await message.success("ANTI_EVERYONE_DISABLED")
          : await message.success("ANTI_EVERYONE_ENABLED");
      }
      case "zws": {
        const current = message.guild.settings.get<boolean>(
          "mod.antizws",
          false
        );
        message.guild.settings.set<boolean>("mod.antizws", !current);
        return current
          ? await message.success("ANTI_ZWS_DISABLED")
          : await message.success("ANTI_ZWS_ENABLED");
      }
      case "spoiler": {
        const current = message.guild.settings.get<boolean>(
          "mod.antispoilers",
          false
        );
        message.guild.settings.set<boolean>("mod.antispoilers", !current);
        return current
          ? await message.success("ANTI_SPOILER_DISABLED")
          : await message.success("ANTI_SPOILER_ENABLED");
      }
      case "selfbot": {
        const current = message.guild.settings.get<boolean>(
          "mod.antiselfbot",
          false
        );
        message.guild.settings.set<boolean>("mod.antiselfbot", !current);
        return current
          ? await message.success("ANTI_SELFBOT_DISABLED")
          : await message.success("ANTI_SELFBOT_ENABLED");
      }
      default: {
        return await message.error("ANTI_UNKNOWN", { valid: valid.join(", ") });
      }
    }
  }
}
