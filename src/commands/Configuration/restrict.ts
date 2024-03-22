import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Restrict extends Command {
  constructor() {
    super("restrict", {
      description: (language: Language) =>
        language.get("RESTRICT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
      slashOnly: true,
      group: true,
    });
  }

  async exec(message: FireMessage) {}
}
