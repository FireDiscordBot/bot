import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Reminders extends Command {
  constructor() {
    super("reminders", {
      description: (language: Language) =>
        language.get("REMINDERS_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      slashOnly: true,
      group: true,
    });
  }

  async exec() {
    return; // base command isn't usable
  }
}
