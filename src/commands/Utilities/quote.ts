import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";

export default class Quote extends Command {
  constructor() {
    super("quote", {
      description: (language: Language) =>
        language.get("QUOTE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "quote",
          type: "message",
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { quote: FireMessage }) {
    if (!args.quote) return;
    return await args.quote.quote(
      message.channel as TextChannel,
      message.member
    );
  }
}
