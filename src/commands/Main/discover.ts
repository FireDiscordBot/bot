import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";

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

  async exec(message: FireMessage) {
    await message.send("DISCOVER_MESSAGE", {
      discovery: constants.url.discovery,
    });
  }
}
