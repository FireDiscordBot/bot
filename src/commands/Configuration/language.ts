import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class LanguageCommand extends Command {
  constructor() {
    super("language", {
      description: (language: Language) =>
        language.get("LANGUAGE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "language",
          type: "language",
          required: false,
          default: null,
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
        language: message.language.id,
        languages: this.client.languages.modules
          .map((lang) => lang.id)
          .join(", "),
      });
    else if (
      message.guild &&
      message.member.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      message.guild.settings.set<string>("utils.language", args.language.id);
      return await message.channel.send(
        // message.success will use message.language which will use author's language if not default
        `${this.client.util.useEmoji("success")} ${args.language.get(
          "LANGUAGE_COMMAND_HELLO_GUILD"
        )}`
      );
    } else {
      message.author.settings.set<string>("utils.language", args.language.id);
      if (message instanceof ApplicationCommandMessage)
        // ts server gets angry without the "as" even though I have the instance check
        (message as ApplicationCommandMessage).flags = 64;
      return await message.success("LANGUAGE_COMMAND_HELLO_USER");
    }
  }
}
