import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class IdentityReset extends Command {
  constructor() {
    super("identity-reset", {
      description: (language: Language) =>
        language.get("IDENTITY_RESET_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      premium: true,
      group: true,
      parent: "identity",
    });
  }

  // base command isn't usable with subcommands
  async run(command: ApplicationCommandMessage) {}
}
