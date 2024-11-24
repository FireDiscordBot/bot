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
    const updatedIncognito = await command.author.settings.set(
      "utils.incognito",
      newValue
    );
    if (!updatedIncognito)
      return await command.error(
        newValue ? "INCOGNITO_COMPROMISED" : "INCOGNITO_STUCK"
      );
    await command.success(
      newValue ? "INCOGNITO_ENABLED" : "INCOGNITO_DISABLED"
    );
  }
}
