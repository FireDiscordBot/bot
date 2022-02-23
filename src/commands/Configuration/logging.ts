import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Logging extends Command {
  constructor() {
    super("logging", {
      description: (language: Language) =>
        language.get("LOGGING_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      group: true,
    });
  }

  async run(command: ApplicationCommandMessage) {}
}
