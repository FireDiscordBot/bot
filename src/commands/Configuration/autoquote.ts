import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class AutoQuote extends Command {
  constructor() {
    super("autoquote", {
      description: (language: Language) =>
        language.get("DISCOVER_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      userPermissions: ["MANAGE_MESSAGES"],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage) {
    const current: boolean = message.guild.settings.get(
      "utils.autoquote",
      false
    );
    message.guild.settings.set("utils.autoquote", !current);
    return await message.success(
      !current ? "AUTOQUOTE_ENABLED" : "AUTOQUOTE_DISABLED"
    );
  }
}
