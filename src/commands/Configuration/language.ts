import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class LanguageCommand extends Command {
  constructor() {
    super("language", {
      description: (language: Language) =>
        language.get("LANGUAGE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "language",
          type: "language",
          default: null,
          required: false,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { language: Language }) {
    if (!args.language)
      return await message.send(
        "LANGUAGE_COMMAND_CURRENT",
        message.language.id
      );
    else {
      this.client.settings.set(
        message.guild.id,
        "utils.language",
        args.language.id
      );
      message.guild.language = args.language;
      message.language = args.language;
      return await message.success("LANGUAGE_COMMAND_HELLO");
    }
  }
}
