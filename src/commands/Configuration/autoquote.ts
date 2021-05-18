import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class AutoQuote extends Command {
  constructor() {
    super("autoquote", {
      description: (language: Language) =>
        language.get("AUTOQUOTE_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage) {
    const current = message.guild.settings.get<boolean>(
      "utils.autoquote",
      false
    );
    message.guild.settings.set<boolean>("utils.autoquote", !current);
    return await message.success(
      !current ? "AUTOQUOTE_ENABLED" : "AUTOQUOTE_DISABLED"
    );
  }
}
