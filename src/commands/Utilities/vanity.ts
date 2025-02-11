import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Vanity extends Command {
  constructor() {
    super("vanity", {
      description: (language: Language) =>
        language.get("VANITY_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      group: true,
    });
  }

  // base command isn't usable with subcommands
  async run(command: ApplicationCommandMessage) {}
}
