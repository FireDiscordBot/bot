import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Discover extends Command {
  constructor() {
    super("discover", {
      description: (language: Language) =>
        language.get("DISCOVER_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    await command.send("DISCOVER_MESSAGE", {
      discovery: constants.url.discovery,
    });
  }
}
