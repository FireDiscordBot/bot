import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
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
  repeatRegex = /--repeat (\d*)/gim;
  stepRegex = /--step ([^-]*)/gim;
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
      context: ["remind me"],
      parent: "reminders",
      restrictTo: "all",
      ephemeral: true,
      slashOnly: true,
    });
  }

  async run(
    // Command#run will usually never have FireMessage, this is temporary to allow the remind command to work as a message command
    // for familiarity and to prompt with an upsell
    command: ApplicationCommandMessage | ContextCommandMessage | FireMessage,
    args: { reminder: string; time: string; repeat: number; step: string }
  ) {
    let { reminder, repeat, step } = args;
    repeat++;
    // handle context menu before actual command
    if (command instanceof ContextCommandMessage) {
      const clickedMessage = (
        command as ContextCommandMessage
      ).getMessage() as FireMessage;
      if (!clickedMessage?.content)
        return await command.error("REMINDER_MISSING_CONTEXT");
      const event = this.client.manager.eventHandler?.store?.get(
        EventType.REMINDER_SEND
      ) as ReminderSendEvent;
      if (!event) return await command.error("ERROR_CONTACT_SUPPORT");
      const now = +new Date();
      // we push a dummy reminder that we use for "snoozing"
      event.sent.push({
        user: command.author.id,
        text: clickedMessage.content,
        link: clickedMessage.url,
        timestamp: now,
      });
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          command.author.language.get("REMINDER_CONTEXT_PLACEHOLDER")
        )
        .setCustomId(`!snooze:${command.author.id}:${now}`)
        .setMaxValues(1)
        .setMinValues(1)
        .addOptions(
          Object.entries(reminderContextTimes).map(([key, time]) => {
            return {
              label: command.author.language.get(key as LanguageKeys),
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
        b.delete();
      });
      return await command.channel.send({
        content: command.author.language.get("REMINDER_CONTEXT_CONTENT", {
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

    if (!reminder)
      return await command.error("REMINDER_MISSING_ARG", {
        includeSlashUpsell: true,
      });
    if (!repeat || repeat > 6 || repeat < 1)
      return await command.error("REMINDER_INVALID_REPEAT", {
        includeSlashUpsell: true,
      });
    if ((!step && repeat > 1) || (step && repeat == 1))
      return await command.error("REMINDER_SEPARATE_FLAGS", {
        includeSlashUpsell: true,
      });
    const stepMinutes = parseTime(step) as number;
    if (
      step &&
      stepMinutes > 0 &&
      stepMinutes < 2 &&
      !command.author.isSuperuser()
    )
      return await command.error("REMINDER_STEP_TOO_SHORT", {
        includeSlashUpsell: true,
      });
    const parsedMinutes = parseTime(args.time) as number;
    if (!parsedMinutes)
      return await command.error("REMINDER_MISSING_TIME", {
        includeSlashUpsell: true,
      });
    else if (parsedMinutes < 2 && !command.author.isSuperuser())
      return await command.error("REMINDER_TOO_SHORT", {
        includeSlashUpsell: true,
      });
    if (!reminder.replace(/\s/gim, "").length && !command.reference?.messageId)
      return await command.error("REMINDER_MISSING_CONTENT", {
        includeSlashUpsell: true,
      });
    else if (!reminder.replace(/\s/gim, "").length) {
      const referenced = await command.channel.messages
        .fetch(command.reference.messageId)
        .catch(() => {});
      if (!referenced || !referenced.content)
        return await command.error("REMINDER_MISSING_CONTENT", {
          includeSlashUpsell: true,
        });
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
      !command.author.isSuperuser()
    )
      return await command.error("REMINDER_TIME_LIMIT", {
        includeSlashUpsell: true,
      });
    let created: { [duration: string]: boolean } = {};
    for (let i = 0; i < repeat; i++) {
      const currentTime = new Date(time);
      currentTime.setMinutes(time.getMinutes() + stepMinutes * i);
      const remind = await command.author.createReminder(
        currentTime,
        reminder,
        command.url
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
      ? await command.success(
          success.length == 1
            ? "REMINDER_CREATED_SINGLE"
            : "REMINDER_CREATED_MULTI",
          {
            time: success[0],
            times: success.map((s) => "- " + s).join("\n"),
            includeSlashUpsell: true,
          }
        )
      : await command.error("ERROR_CONTACT_SUPPORT", {
          includeSlashUpsell: true,
        });
  }
}
