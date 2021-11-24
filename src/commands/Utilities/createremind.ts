import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { parseTime } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { EventType } from "@fire/lib/ws/util/constants";
import ReminderSendEvent from "@fire/src/ws/events/ReminderSendEvent";
import {
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  SnowflakeUtil,
} from "discord.js";
import * as moment from "moment";

const repeatRegex = /--repeat (\d*)/gim;
const stepRegex = /--step ([^-]*)/gim;
const reminderContextTimes = {
  REMINDER_SNOOZE_FIVEMIN: "300000",
  REMINDER_SNOOZE_HALFHOUR: "1800000",
  REMINDER_SNOOZE_HOUR: "3600000",
  REMINDER_SNOOZE_SIXHOURS: "21600000",
  REMINDER_SNOOZE_HALFDAY: "43200000",
  REMINDER_SNOOZE_DAY: "86400000",
  REMINDER_SNOOZE_THREEDAYS: "259200000",
  REMINDER_SNOOZE_WEEK: "604800000",
  REMINDER_SNOOZE_FORTNIGHT: "1209600000",
  REMINDER_SNOOZE_MONTH: "2628060000",
};

export default class RemindersCreate extends Command {
  constructor() {
    super("reminders-create", {
      description: (language: Language) =>
        language.get("REMINDERS_CREATE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "reminder",
          type: "string",
          description: (language: Language) =>
            language.get("REMINDERS_CREATE_MSG_ARG_DESCRIPTION"),
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
      context: ["remind me"],
      parent: "reminders",
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { reminder: string; time: string }) {
    let { reminder } = args;
    // handle context menu before actual command
    if (message instanceof ContextCommandMessage) {
      const clickedMessage = (
        message as ContextCommandMessage
      ).getMessage() as FireMessage;
      if (!clickedMessage?.content)
        return await message.error("REMINDER_MISSING_CONTEXT");
      const event = this.client.manager.eventHandler?.store?.get(
        EventType.REMINDER_SEND
      ) as ReminderSendEvent;
      if (!event) return await message.error("ERROR_CONTACT_SUPPORT");
      const now = +new Date();
      // we push a dummy reminder that we use for "snoozing"
      event.sent.push({
        user: message.author.id,
        text: clickedMessage.content,
        link: clickedMessage.url,
        timestamp: now,
      });
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          message.author.language.get("REMINDER_CONTEXT_PLACEHOLDER")
        )
        .setCustomId(`!snooze:${message.author.id}:${now}`)
        .setMaxValues(1)
        .setMinValues(1)
        .addOptions(
          Object.entries(reminderContextTimes).map(([key, time]) => {
            return {
              label: message.author.language.get(key as LanguageKeys),
              value: time,
            };
          })
        );
      const cancelSnowflake = SnowflakeUtil.generate();
      const cancelButton = new MessageButton()
        .setEmoji("534174796938870792")
        .setStyle("DANGER")
        .setCustomId(`!${cancelSnowflake}`);
      this.client.buttonHandlersOnce.set(cancelSnowflake, (b) => {
        event.sent = event.sent.filter((r) => r.timestamp != now);
        b.channel
          .update({
            content: b.language.get("INTERACTION_CANCELLED"),
            components: [],
          })
          .catch(() => {});
      });
      return await message.channel.send({
        content: message.author.language.get("REMINDER_CONTEXT_CONTENT", {
          content:
            clickedMessage.content.length >= 503
              ? clickedMessage.content.slice(0, 500) + "..."
              : clickedMessage.content,
        }),
        components: [
          new MessageActionRow().addComponents(dropdown),
          new MessageActionRow().addComponents(cancelButton),
        ],
      });
    }

    if (!reminder) return await message.error("REMINDER_MISSING_ARG");
    let repeat: number, step: string;
    const repeatExec = repeatRegex.exec(reminder);
    if (repeatExec?.length == 2) repeat = parseInt(repeatExec[1]);
    else repeat = 0;
    repeatRegex.lastIndex = 0;
    repeat++;
    if (!repeat || repeat > 6 || repeat < 1)
      return await message.error("REMINDER_INVALID_REPEAT");
    reminder = reminder.replace(repeatRegex, "");
    const stepExec = stepRegex.exec(reminder) || [""];
    stepRegex.lastIndex = 0;
    step = stepExec[0] || "";
    if ((!step && repeat > 1) || (step && repeat == 1))
      return await message.error("REMINDER_SEPARATE_FLAGS");
    reminder = reminder.replace(stepRegex, "").trimEnd();
    const stepMinutes = parseTime(step) as number;
    if (step && stepMinutes > 0 && stepMinutes < 2)
      return await message.error("REMINDER_STEP_TOO_SHORT");
    const parsedMinutes = parseTime(args.time) as number;
    if (!parsedMinutes) return await message.error("REMINDER_MISSING_TIME");
    else if (parsedMinutes < 2)
      return await message.error("REMINDER_TOO_SHORT");
    if (!reminder.replace(/\s/gim, "").length && !message.reference?.messageId)
      return await message.error("REMINDER_MISSING_CONTENT");
    else if (!reminder.replace(/\s/gim, "").length) {
      const referenced = await message.channel.messages
        .fetch(message.reference.messageId)
        .catch(() => {});
      if (!referenced || !referenced.content)
        return await message.error("REMINDER_MISSING_CONTENT");
      else reminder = referenced.content;
    }
    const time = new Date();
    time.setMinutes(time.getMinutes() + parsedMinutes);
    const largestTime = new Date();
    largestTime.setMinutes(
      largestTime.getMinutes() +
        (stepMinutes ? stepMinutes * repeat : parsedMinutes)
    );
    if (
      moment(largestTime).diff(moment(), "months") >= 7 &&
      !message.author.isSuperuser()
    )
      return await message.error("REMINDER_TIME_LIMIT");
    let created: { [duration: string]: boolean } = {};
    for (let i = 0; i < repeat; i++) {
      const currentTime = new Date(time);
      currentTime.setMinutes(time.getMinutes() + stepMinutes * i);
      const remind = await message.author.createReminder(
        currentTime,
        reminder,
        message.url
      );
      created[Formatters.time(currentTime, "R")] = remind;
    }
    const success = Object.entries(created)
      .filter(([, success]) => success)
      .map(([duration]) => duration);
    const failed = Object.entries(created)
      .filter(([, success]) => !success)
      .map(([duration]) => duration);
    return failed.length != repeat
      ? await message.success(
          success.length == 1
            ? "REMINDER_CREATED_SINGLE"
            : "REMINDER_CREATED_MULTI",
          {
            time: success[0],
            times: success.map((s) => "- " + s).join("\n"),
          }
        )
      : await message.error("ERROR_CONTACT_SUPPORT");
  }
}
