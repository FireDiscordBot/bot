import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { TimestampStyle } from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
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
    _: ApplicationCommandMessage,
    __: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    return [
      { name: "Short Time (e.g. 16:20)", value: "t" },
      {
        name: "Long Time (e.g. 16:20:30)",
        value: "T",
      },
      {
        name: "Short Date (e.g. 20/04/2021)",
        value: "d",
      },
      {
        name: "Long Date (e.g. 20 April 2021)",
        value: "D",
      },
      {
        name: "Short Date/Time (e.g. 20 April 2021 16:20)",
        value: "f",
      },
      {
        name: "Long Date/Time (e.g. Tuesday, 20 April 2021 16:20)",
        value: "F",
      },
      {
        name: "Relative Time (e.g. 2 months ago)",
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
