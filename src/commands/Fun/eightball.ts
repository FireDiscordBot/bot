import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Eightball extends Command {
  constructor() {
    super("8ball", {
      description: (language: Language) =>
        language.get("EIGHTBALL_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      ephemeral: true,
      args: [
        {
          id: "question",
          type: "string",
          required: true,
          default: null,
        },
      ],
      aliases: ["eightball"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { question?: string }) {
    if (!args.question?.trim().endsWith("?"))
      return await message.send("EIGHTBALL_NO_QUESTION");
    await message.send("EIGHTBALL_ANSWER");
  }
}
