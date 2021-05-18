import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class AutoDecancer extends Command {
  constructor() {
    super("autodecancer", {
      description: (language: Language) =>
        language.get("AUTODECANCER_COMMAND_DESCRIPTION"),
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
    const current = message.guild.settings.get<boolean>(
      "mod.autodecancer",
      false
    );

    message.guild.settings.set<boolean>("mod.autodecancer", !current);

    return !current
      ? message.success("AUTODECANCER_ENABLED")
      : message.success("AUTODECANCER_DISABLED");
  }
}
