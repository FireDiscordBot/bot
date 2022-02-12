import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class SelectText extends Command {
  constructor() {
    super("select-text", {
      description: (language: Language) =>
        language.get("SELECT_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "text",
          type: "string",
          description: (language: Language) =>
            language.get("SELECT_TEXT_ARG_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: false,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
      parent: "select",
    });
  }

  async exec(message: FireMessage, args: { text: string }) {
    if (!this.client.selectHandlers.has(`${message.author.id}:text`))
      return await message.error("SELECT_NO_PROMPT");
    const handler = this.client.selectHandlers.get(`${message.author.id}:text`);
    this.client.selectHandlers.delete(`${message.author.id}:text`);
    handler(args.text);
    return await message.send("SELECT_PROMPT_FINISHED");
  }
}
