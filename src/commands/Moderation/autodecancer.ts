import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class AutoDecancer extends Command {
  constructor() {
    super("autodecancer", {
      description: (language: Language) =>
        language.get("AUTODECANCER_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_NICKNAMES"],
      clientPermissions: ["SEND_MESSAGES", "MANAGE_NICKNAMES"],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  exec(message: FireMessage) {
    const current = message.guild.settings.get("mod.autodecancer", false);

    message.guild.settings.set("mod.autodecancer", !current);

    return !current
      ? message.success("AUTODECANCER_ENABLED")
      : message.success("AUTODECANCER_DISABLED");
  }
}
