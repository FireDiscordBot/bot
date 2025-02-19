import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { TimestampStyle } from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { ParsedTime } from "@fire/src/arguments/time";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  Formatters,
} from "discord.js";

export default class Timestamp extends Command {
  constructor() {
    super("time-stamp", {
      description: (language: Language) =>
        language.get("TIME_STAMP_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "time",
          type: "time",
          description: (language: Language) =>
            language.get("TIME_STAMP_ARGUMENT_TIME_DESCRIPTION"),
          required: false,
        },
        {
          id: "style",
          type: "string",
          description: (language: Language) =>
            language.get("TIME_STAMP_ARGUMENT_STYLE_DESCRIPTION"),
          autocomplete: true,
          required: false,
          default: "f",
        },
      ],
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
      parent: "time",
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    __: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    return [
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.t" as LanguageKeys
        ),
        value: "t",
      },
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.T" as LanguageKeys
        ),
        value: "T",
      },
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.d" as LanguageKeys
        ),
        value: "d",
      },
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.D" as LanguageKeys
        ),
        value: "D",
      },
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.f" as LanguageKeys
        ),
        value: "f",
      },
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.F" as LanguageKeys
        ),
        value: "F",
      },
      {
        name: interaction.language.get(
          "TIME_STAMP_STYLES_AUTOCOMPLETE.R" as LanguageKeys
        ),
        value: "R",
      },
    ];
  }

  async run(
    command: ApplicationCommandMessage,
    args: { time?: ParsedTime; style: TimestampStyle }
  ) {
    const time = args.time ? args.time.date : new Date();
    const style = args.style as TimestampStyle;
    const stamp = Formatters.time(time, style);
    await command.channel.send({ content: `${stamp}\`\`\`${stamp}\`\`\`` });
  }
}
