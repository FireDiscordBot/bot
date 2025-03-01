import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { TimestampStyle } from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { ParsedTime, parseTime } from "@fire/src/arguments/time";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  Formatters,
} from "discord.js";

const styles = ["t", "T", "d", "D", "f", "F", "R"] as const;

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
    let parsed: ParsedTime;
    const selectedTime = interaction.slashCommand.options.getString(
      "time",
      false
    );
    if (selectedTime)
      parsed = parseTime(
        selectedTime,
        interaction.createdAt,
        interaction.author.timezone,
        interaction
      );

    return styles.map((style) => ({
      name: interaction.language.get(
        `TIME_STAMP_STYLES_AUTOCOMPLETE.${style}`,
        {
          time:
            parsed && parsed.date
              ? this.client.util.getTimestamp(
                  parsed.date,
                  interaction.language,
                  interaction.author.timezone,
                  style
                )
              : interaction.language.get(
                  `TIME_STAMP_STYLES_AUTOCOMPLETE.${style}_example`
                ),
        }
      ),
      value: style,
    }));
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
