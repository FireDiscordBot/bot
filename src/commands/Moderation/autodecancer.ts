import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class AutoDecancer extends Command {
  constructor() {
    super("autodecancer", {
      description: (language: Language) =>
        language.get("AUTODECANCER_COMMAND_DESCRIPTION"),
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
      "mod.autodecancer",
      false
    );

    await message.guild.settings.set<boolean>(
      "mod.autodecancer",
      !current,
      message.author
    );

    return !current
      ? await message.success("AUTODECANCER_ENABLED")
      : await message.success("AUTODECANCER_DISABLED");
  }
}
