import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Eightball extends Command {
  constructor() {
    super("8ball", {
      description: (language: Language) =>
        language.get("EIGHTBALL_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
    });
  }

  async exec(message: FireMessage) {
    if (!message.content.trim().endsWith("?"))
      return await message.send("EIGHTBALL_NO_QUESTION");
    await message.send("EIGHTBALL_ANSWER");
  }
}
