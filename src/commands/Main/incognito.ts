import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Incognito extends Command {
  constructor() {
    super("incognito", {
      description: (language: Language) =>
        language.get("INCOGNITO_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const newValue = !command.author.settings.get<boolean>(
      "utils.incognito",
      false
    );
    await command.author.settings.set("utils.incognito", newValue);
    await command.success(
      newValue ? "INCOGNITO_ENABLED" : "INCOGNITO_DISABLED"
    );
  }
}
