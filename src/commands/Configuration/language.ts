import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
} from "discord.js";

export default class LanguageCommand extends Command {
  constructor() {
    super("language", {
      description: (language: Language) =>
        language.get("LANGUAGE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "language",
          type: "language",
          description: (language: Language) =>
            language.get("LANGUAGE_COMMAND_ARGUMENT_LANGUAGE_DESCRIPTION"),
          autocomplete: true,
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async autocomplete(
    _: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    return this.client.languages.modules
      .filter((lang: Language) =>
        focused.value
          ? lang.name.includes(focused.value.toString()) ||
            lang.id.includes(focused.value.toString())
          : true
      )
      .map((lang: Language) => ({
        name: lang.name,
        value: lang.id,
      }));
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
      const updatedLang = await message.guild.settings.set<string>(
        "utils.language",
        args.language.id,
        message.author
      );
      if (updatedLang)
        return await message.channel.send(
          // message.success will use message.language which will use author's language if not default
          `${this.client.util.useEmoji("success")} ${args.language.get(
            "LANGUAGE_COMMAND_HELLO_GUILD"
          )}`
        );
      else
        return await message.channel.send(
          // message.error will also use message.language
          `${this.client.util.useEmoji("error")} ${args.language.get(
            "LANGUAGE_COMMAND_UPDATE_FAILED"
          )}`
        );
    } else {
      const updatedLang = await message.author.settings.set<string>(
        "utils.language",
        args.language.id
      );
      if (message instanceof ApplicationCommandMessage)
        // ts server gets angry without the "as" even though I have the instance check
        (message as ApplicationCommandMessage).flags = 64;
      if (updatedLang)
        return await message.success("LANGUAGE_COMMAND_HELLO_USER");
      else return await message.error("LANGUAGE_COMMAND_UPDATE_FAILED");
    }
  }
}
