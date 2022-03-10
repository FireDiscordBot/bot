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
          default: null,
          match: "rest",
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
        {
          id: "repeat",
          type: "number",
          description: (language: Language) =>
            language.get("REMINDERS_CREATE_REPEAT_ARG_DESCRIPTION"),
          default: 0,
          required: false,
        },
        {
          id: "step",
          type: "string",
          description: (language: Language) =>
            language.get("REMINDERS_CREATE_STEP_ARG_DESCRIPTION"),
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { reminder: string; time: string; repeat: number; step: string }
  ) {
    // we're coming from a slash command with the proper args so we can jump right into the real command
    return await this.client.getCommand("reminders-create").run(command, args);
  }

  async exec(
    message: FireMessage,
    args: { reminder: string; time: string; repeat: number; step: string }
  ) {
    const remindCommand = this.client.getCommand(
      "reminders-create"
    ) as RemindersCreate;

    // we're coming from a message with a single argument so we need to split it before we can run the commandss
    let content = args.reminder;
    if (!args.reminder)
      return await message.error("REMINDER_MISSING_ARG", {
        includeSlashUpsell: true,
      });
    let repeat: number, step: string;
    const repeatExec = remindCommand.repeatRegex.exec(content);
    if (repeatExec?.length == 2) repeat = parseInt(repeatExec[1]);
    else repeat = 0;
    remindCommand.repeatRegex.lastIndex = 0;
    content = content.replace(remindCommand.repeatRegex, "");
    const stepExec = remindCommand.stepRegex.exec(content);
    remindCommand.stepRegex.lastIndex = 0;
    step = stepExec?.[1] || "";
    content = content.replace(remindCommand.stepRegex, "").trimEnd();
    return await remindCommand.run(message, {
      reminder: parseTime(content, true) as string,
      time: pluckTime(content),
      repeat,
      step,
    });
  }
}
