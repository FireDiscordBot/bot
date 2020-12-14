import { humanize, parseTime } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as moment from "moment";

export default class Remind extends Command {
  constructor() {
    super("remind", {
      description: (language: Language) =>
        language.get("REMIND_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "reminder",
          type: "string",
          description: (language: Language) =>
            language.get("REMIND_ARG_DESCRIPTION"),
          default: null,
          required: true,
        },
      ],
      aliases: ["remindme", "reminder"],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { reminder?: string }) {
    if (!args.reminder) return await message.error("REMINDER_MISSING_ARG");
    const parsedMinutes = parseTime(args.reminder) as number;
    if (!parsedMinutes) return await message.error("REMINDER_MISSING_TIME");
    const reminder = parseTime(args.reminder, true) as string;
    if (!reminder.replace(/\s/gim, "").length)
      return await message.error("REMINDER_MISSING_CONTENT");
    const time = new Date();
    time.setMinutes(time.getMinutes() + parsedMinutes);
    if (
      moment(time).diff(moment(), "days") > 90 &&
      !message.author.isSuperuser()
    )
      return await message.error("REMINDER_TIME_LIMIT");
    else if (moment(time).diff(moment(), "minutes") < 2)
      return await message.error("REMINDER_TOO_SHORT");
    const duration = moment(time).diff(moment());
    const created = await message.author.createReminder(
      time,
      reminder,
      message.url
    );
    return created
      ? await message.success(
          "REMINDER_CREATED",
          humanize(duration, message.language.id.split("-")[0])
        )
      : await message.error();
  }
}
