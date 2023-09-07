import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { CommonContext } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import {
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  Permissions,
} from "discord.js";

export default class LogScan extends Command {
  valid = {
    names: ["cheats", "clients", "mobile", "cracked"],
    options: (command: CommonContext) => {
      if (!command.guild) return [];
      return [
        {
          label: command.language.get("MINECRAFT_LOGSCAN_OPTION_CHEATS"),
          value: "cheats",
          description: command.language.get(
            "MINECRAFT_LOGSCAN_OPTION_CHEATS_DESC"
          ),
          default: command.guild.settings.get<boolean>(
            "minecraft.logscan.cheats",
            false
          ),
        },
        {
          label: command.language.get("MINECRAFT_LOGSCAN_OPTION_CLIENTS"),
          value: "clients",
          description: command.language.get(
            "MINECRAFT_LOGSCAN_OPTION_CLIENTS_DESC"
          ),
          default: command.guild.settings.get<boolean>(
            "minecraft.logscan.clients",
            false
          ),
        },
        {
          label: command.language.get("MINECRAFT_LOGSCAN_OPTION_MOBILE"),
          value: "mobile",
          description: command.language.get(
            "MINECRAFT_LOGSCAN_OPTION_MOBILE_DESC"
          ),
          default: command.guild.settings.get<boolean>(
            "minecraft.logscan.mobile",
            false
          ),
        },
        {
          label: command.language.get("MINECRAFT_LOGSCAN_OPTION_CRACKED"),
          value: "cracked",
          description: command.language.get(
            "MINECRAFT_LOGSCAN_OPTION_CRACKED_DESC"
          ),
          default: command.guild.settings.get<boolean>(
            "minecraft.logscan.cracked",
            false
          ),
        },
      ];
    },
  };
  constructor() {
    super("minecraft-log-scan", {
      description: (language: Language) =>
        language.get("MINECRAFT_LOGSCAN_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      enableSlashCommand: false,
      restrictTo: "guild",
      parent: "minecraft",
      slashOnly: true,
      premium: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    if (command.hasExperiment(77266757, [1, 2]))
      return await command.error("MINECRAFT_LOGSCAN_MANUAL");
    return await command.send("MINECRAFT_LOGSCAN_MESSAGE", {
      components: this.getMenuComponents(command),
    });
  }

  getMenuComponents(context: CommonContext) {
    const currentLogScanStatus = context.guild.settings.get(
      "minecraft.logscan",
      false
    );
    return [
      new MessageActionRow().addComponents([
        new MessageButton()
          .setCustomId("!mclogscan:toggle")
          .setLabel(
            currentLogScanStatus
              ? context.language.get("MINECRAFT_LOGSCAN_DISABLE")
              : context.language.get("MINECRAFT_LOGSCAN_ENABLE")
          )
          .setStyle(currentLogScanStatus ? "DANGER" : "SUCCESS"),
      ]),
      new MessageActionRow().addComponents([
        new MessageSelectMenu()
          .setPlaceholder(context.language.get("MINECRAFT_LOGSCAN_PLACEHOLDER"))
          .setCustomId("!mclogscan:configure")
          .addOptions(this.valid.options(context))
          .setMinValues(0)
          .setMaxValues(this.valid.names.length),
      ]),
    ];
  }
}
