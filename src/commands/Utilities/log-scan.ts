import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class LogScan extends Command {
  constructor() {
    super("minecraft-log-scan", {
      description: (language: Language) =>
        language.get("MINECRAFT_LOGSCAN_COMMAND_DESCRIPTION"),
      enableSlashCommand: false,
      restrictTo: "guild",
      parent: "minecraft",
      slashOnly: true,
      premium: true,
    });
  }

  async exec(message: FireMessage) {
    if (message.hasExperiment(77266757, [1, 2]))
      return await message.error("MINECRAFT_LOGSCAN_MANUAL");
    const current = message.guild.settings.get("minecraft.logscan", false);
    await message.guild.settings.set("minecraft.logscan", !current);
    if (message.guild.settings.get("minecraft.logscan", current) == current)
      return await message.error("MINECRAFT_LOGSCAN_TOGGLE_FAIL");
    return await message.success(
      !current ? "MINECRAFT_LOGSCAN_ENABLED" : "MINECRAFT_LOGSCAN_DISABLED"
    );
  }
}
