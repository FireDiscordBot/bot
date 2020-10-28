import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class AutoDehoist extends Command {
  constructor() {
    super("autodehoist", {
      description: (language: Language) =>
        language.get("AUTODEHOIST_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_NICKNAMES"],
      clientPermissions: ["SEND_MESSAGES", "MANAGE_NICKNAMES"],
    });
  }

  exec(message: FireMessage) {
    const current = message.guild.settings.get("mod.autodehoist", false);

    message.guild.settings.set("mod.autodehoist", !current);

    return !current
      ? message.success("AUTODEHOIST_ENABLED")
      : message.success("AUTODEHOIST_DISABLED");
  }
}
