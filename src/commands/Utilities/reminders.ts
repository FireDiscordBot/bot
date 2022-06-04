import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Reminders extends Command {
  constructor() {
    super("reminders", {
      description: (language: Language) =>
        language.get("REMINDERS_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      group: true,
    });
  }

  async exec() {
    return; // base command isn't usable
  }
}
