import { SlashCommandMessage } from "@fire/lib/extensions/slashcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class LanguageCommand extends Command {
  constructor() {
    super("language", {
      description: (language: Language) =>
        language.get("LANGUAGE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "language",
          type: "language",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      aliases: ["lang"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { language: Language }) {
    if (!args.language)
      return await message.send("LANGUAGE_COMMAND_CURRENT", {
        current: message.language.id,
        languages: this.client.languages.modules
          .map((lang) => lang.id)
          .join(", "),
      });
    else if (
      message.guild &&
      message.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)
    ) {
      message.guild.settings.set<string>("utils.language", args.language.id);
      return await message.channel.send(
        // message.success will use message.language which will use author's language if not default
        `${constants.emojis.success} ${args.language.get(
          "LANGUAGE_COMMAND_HELLO_GUILD"
        )}`
      );
    } else {
      message.author.settings.set<string>("utils.language", args.language.id);
      if (message instanceof SlashCommandMessage)
        // ts server gets angry without the "as" even though I have the instance check
        (message as SlashCommandMessage).flags = 64;
      return await message.success("LANGUAGE_COMMAND_HELLO_USER");
    }
  }
}
