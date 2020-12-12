import { SlashCommandMessage } from "../../../lib/extensions/slashCommandMessage";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class LanguageCommand extends Command {
  constructor() {
    super("language", {
      description: (language: Language) =>
        language.get("LANGUAGE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      args: [
        {
          id: "language",
          type: "language",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { language: Language }) {
    if (!args.language)
      return await message.send(
        "LANGUAGE_COMMAND_CURRENT",
        message.language.id
      );
    else if (message.guild && message.member.hasPermission("MANAGE_GUILD")) {
      args.language.id == "en-US"
        ? message.guild.settings.delete("utils.language") // en-US is default so we can delete the setting instead
        : message.guild.settings.set("utils.language", args.language.id);
      message.guild.language = args.language;
      message.language = args.language;
      return await message.success("LANGUAGE_COMMAND_HELLO", "guild");
    } else {
      args.language.id == "en-US"
        ? message.author.settings.delete("utils.language")
        : message.author.settings.set("utils.language", args.language.id);
      message.author.language = args.language;
      message.language = args.language;
      if (message instanceof SlashCommandMessage) message.setFlags(64);
      return await message.success("LANGUAGE_COMMAND_HELLO", "user");
    }
  }
}
