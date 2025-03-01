import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import type { Range } from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

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
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage, args: { question?: string }) {
    if (!args.question?.trim().endsWith("?"))
      return await command.send("EIGHTBALL_NO_QUESTION");
    const responses = command.language.get(
      `EIGHTBALL_ANSWERS.${this.client.util.randInt(
        1,
        20
      )}` as `EIGHTBALL_ANSWERS.${Range<1, 20>}`,
      {
        returnObjects: true,
      }
    ) as unknown as string[];
    await command.channel.send(
      responses[Math.floor(Math.random() * responses.length)]
    );
  }
}
