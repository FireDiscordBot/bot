import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class AutoDehoist extends Command {
  constructor() {
    super("autodehoist", {
      description: (language: Language) =>
        language.get("AUTODEHOIST_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageNicknames,
      ],
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage) {
    const current = message.guild.settings.get<boolean>(
      "mod.autodehoist",
      false
    );

    await message.guild.settings.set<boolean>(
      "mod.autodehoist",
      !current,
      message.author
    );

    return !current
      ? await message.success("AUTODEHOIST_ENABLED")
      : await message.success("AUTODEHOIST_DISABLED");
  }
}
