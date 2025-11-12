import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Identity extends Command {
  constructor() {
    super("identity", {
      description: (language: Language) =>
        language.get("IDENTITY_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      premium: true,
      group: true,
    });
  }

  // base command isn't usable with subcommands
  async run(command: ApplicationCommandMessage) {}
}
