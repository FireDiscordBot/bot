import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Minecraft extends Command {
  constructor() {
    super("minecraft", {
      description: (language: Language) =>
        language.get("MINECRAFT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      group: true,
    });
  }

  // base command isn't usable with subcommands
  async exec(message: FireMessage) {}
}
