import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteractionOption,
} from "discord.js";
import Timezone from "./time-zone";

export default class RemindersTimezone extends Command {
  constructor() {
    super("reminders-timezone", {
      description: (language: Language) =>
        language.get("REMINDERS_TIMEZONE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "timezone",
          type: "string",
          description: (language: Language) =>
            language.get("TIME_ZONE_ARGUMENT_TIMEZONE_DESCRIPTION"),
          autocomplete: true,
          required: true,
          default: "Etc/UTC",
        },
      ],
      parent: "reminders",
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async autocomplete(
    _: ApplicationCommandMessage,
    focused: CommandInteractionOption<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[]> {
    const timezoneCommand = this.client.getCommand("time-zone") as Timezone;
    return timezoneCommand.autocomplete(_, focused);
  }

  async run(command: ApplicationCommandMessage, args: { timezone: string }) {
    const timezoneCommand = this.client.getCommand("time-zone") as Timezone;
    return timezoneCommand.run(command, args);
  }
}
