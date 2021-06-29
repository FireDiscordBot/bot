import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Discover extends Command {
  constructor() {
    super("suggest", {
      description: (language: Language) =>
        language.get("SUGGEST_COMMAND_DESCRIPTION"),
      hidden: true,
    });
  }

  async exec(message: FireMessage) {
    return await message.error("SUGGEST_COMMAND_DEPRECATED");
  }
}
