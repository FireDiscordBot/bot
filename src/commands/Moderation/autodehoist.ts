import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class AutoDehoist extends Command {
  constructor() {
    super("autodehoist", {
      description: (language: Language) =>
        language.get("AUTODEHOIST_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_NICKNAMES,
      ],
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
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
