import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Role } from "discord.js";

export default class SelectRole extends Command {
  constructor() {
    super("select-discord-role", {
      description: (language: Language) =>
        language.get("SELECT_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "role",
          type: "role",
          description: (language: Language) =>
            language.get("SELECT_ROLE_ARG_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: false,
      parent: "select-discord",
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { role: Role }) {
    if (!this.client.selectHandlers.has(`${message.author.id}:role`))
      return await message.error("SELECT_NO_PROMPT");
    const handler = this.client.selectHandlers.get(`${message.author.id}:role`);
    this.client.selectHandlers.delete(`${message.author.id}:role`);
    handler(args.role);
    return await message.send("SELECT_PROMPT_FINISHED");
  }
}
