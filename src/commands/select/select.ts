import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Select extends Command {
  constructor() {
    super("select", {
      description: (language: Language) =>
        language.get("SELECT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      category: "Main",
      slashOnly: true,
      ephemeral: true,
      group: true,
    });
  }

  async exec() {
    return; // base command isn't usable
  }
}
