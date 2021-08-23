import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class OpenSource extends Command {
  constructor() {
    super("oss", {
      description: (language: Language) =>
        language.get("OSS_COMMAND_DESCRIPTION"),
      aliases: ["github", "source", "code"],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async exec(message: FireMessage) {
    await message.send("OSS_MESSAGE");
  }
}
