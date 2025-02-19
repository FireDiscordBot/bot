import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Time extends Command {
  constructor() {
    super("time", {
      description: (language: Language) =>
        language.get("TIME_COMMAND_DESCRIPTION"),
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
