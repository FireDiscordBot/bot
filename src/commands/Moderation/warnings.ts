import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Warnings extends Command {
  constructor() {
    super("warnings", {
      description: (language: Language) =>
        language.get("WARNINGS_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
      group: true,
    });
  }

  async run(command: ApplicationCommandMessage) {}
}
