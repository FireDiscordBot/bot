import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class OpenSource extends Command {
  constructor() {
    super("oss", {
      description: (language: Language) =>
        language.get("OSS_COMMAND_DESCRIPTION"),
      aliases: ["github", "source", "code"],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage) {
    await message.send("OSS_MESSAGE");
  }
}
