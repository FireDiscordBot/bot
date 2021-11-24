import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { parseTime, pluckTime } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import RemindersCreate from "./createremind";

export default class Remind extends Command {
  constructor() {
    super("remind", {
      description: (language: Language) =>
        language.get("REMINDERS_CREATE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "reminder",
          type: "string",
          description: (language: Language) =>
            language.get("REMINDERS_CREATE_MSG_ARG_DESCRIPTION"),
          match: "rest",
          default: null,
          required: true,
        },
        {
          id: "time",
          type: "string",
          description: (language: Language) =>
            language.get("REMINDERS_CREATE_TIME_ARG_DESCRIPTION"),
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { reminder: string; time: string }
  ) {
    // we're coming from a slash command with the proper args so we can jump right into the real command
    return await this.client.getCommand("reminders-create").run(command, args);
  }

  async exec(message: FireMessage, args: { reminder: string; time: string }) {
    // we're coming from a message with a single argument so we need to split it before we can run the command
    args = {
      reminder: parseTime(args.reminder, true) as string,
      time: pluckTime(args.reminder),
    };
    return await (
      this.client.getCommand("reminders-create") as RemindersCreate
    ).run(message, args);
  }
}
