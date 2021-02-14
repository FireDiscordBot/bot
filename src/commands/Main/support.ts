import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Support extends Command {
  constructor() {
    super("support", {
      description: (language: Language) =>
        language.get("SUPPORT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage) {
    await message.channel.send(`<${constants.url.support}>`);
  }
}
