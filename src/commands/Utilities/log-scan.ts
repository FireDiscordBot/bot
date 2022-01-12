import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Permissions } from "discord.js";

export default class LogScan extends Command {
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
    const current = command.guild.settings.get("minecraft.logscan", false);
    await command.guild.settings.set("minecraft.logscan", !current);
    if (command.guild.settings.get("minecraft.logscan", current) == current)
      return await command.error("MINECRAFT_LOGSCAN_TOGGLE_FAIL");
    return await command.success(
      !current ? "MINECRAFT_LOGSCAN_ENABLED" : "MINECRAFT_LOGSCAN_DISABLED"
    );
  }
}
