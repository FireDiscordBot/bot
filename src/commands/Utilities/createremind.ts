import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { classicRemind } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { EventType } from "@fire/lib/ws/util/constants";
import { ParsedTime } from "@fire/src/arguments/time";
import ReminderSendEvent from "@fire/src/ws/events/ReminderSendEvent";
import { ParsedResult, casual } from "chrono-node";
import * as dayjs from "dayjs";
import {
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  SnowflakeUtil,
} from "discord.js";

const reminderContextTimes = {
  REMINDER_SNOOZE_FIVEMIN: 300000,
  REMINDER_SNOOZE_HALFHOUR: 1800000,
  REMINDER_SNOOZE_HOUR: 3600000,
  REMINDER_SNOOZE_SIXHOURS: 21600000,
  REMINDER_SNOOZE_HALFDAY: 43200000,
  REMINDER_SNOOZE_DAY: 86400000,
  REMINDER_SNOOZE_THREEDAYS: 259200000,
  REMINDER_SNOOZE_WEEK: 604800000,
  REMINDER_SNOOZE_FORTNIGHT: 1209600000,
  REMINDER_SNOOZE_MONTH: 2628060000,
  REMINDER_SNOOZE_OTHER: "other",
};
const doubledUpWhitespace = /\s{2,}/g;

const getContextOptions = (
  parsed: ParsedResult[],
  context: ContextCommandMessage
) => {
  if (parsed.length) {
    const options: { label: string; value: string }[] = [];
    for (const match of parsed)
      options.push({
        label: match.text,
        value: (+match.start.date()).toString(),
      });
    options.push({
      label: context.author.language.get("REMINDER_SNOOZE_OTHER"),
      value: "other",
    });
    return options;
  } else
    return Object.entries(reminderContextTimes).map(([key, time]) => {
      return {
        label: context.author.language.get(key as LanguageKeys),
        value:
          typeof time == "number"
            ? (context.createdTimestamp + time).toString()
            : time,
      };
    });
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
          type: "time",
          description: (language: Language) =>
            language.get("REMINDERS_CREATE_MSG_ARG_DESCRIPTION"),
          slashCommandType: "reminder",
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
    // FireMessage is here to allow for the --remind flag
    command: ApplicationCommandMessage | ContextCommandMessage | FireMessage,
    args: { reminder: ParsedTime | null; repeat: number; step: string }
  ) {
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

      // Parse with chrono-node early so we can get the content without the time
      const parsed = casual.parse(clickedMessage.content, command.createdAt, {
        forwardDate: true,
      });
      let reminderText = clickedMessage.content;
      for (const result of parsed)
        reminderText = reminderText.replace(result.text, "");
      reminderText = reminderText.replace(doubledUpWhitespace, " ").trim();

      // we push a dummy reminder that we use for "snoozing"
      event.sent.push({
        user: command.author.id,
        text: reminderText,
        link: clickedMessage.url,
        timestamp: now,
      });

      // we push a dummy reminder that we use for "snoozing"
      event.sent.push({
        user: command.author.id,
        text: reminderText,
        link: clickedMessage.url,
        timestamp: now,
      });

      // Create the components
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          command.author.language.get("REMINDER_CONTEXT_PLACEHOLDER")
        )
        .setCustomId(`!snooze:${command.author.id}:${now}`)
        .setMinValues(1)
        .addOptions(getContextOptions(parsed, command));
      if (!parsed.length) dropdown.setMaxValues(1);
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
            reminderText.length >= 503
              ? reminderText.slice(0, 500) + "..."
              : reminderText,
        }),
        components: [
          new MessageActionRow().addComponents(dropdown),
          new MessageActionRow().addComponents(cancelButton),
        ],
      });
    }

    // extract args
    let { reminder, repeat, step } = args;
    repeat++; // we need repeat to include the inital reminder
    // quick checks
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

    // parse step argument
    const parsedStep = classicRemind.parse(step, command.createdAt, {
      forwardDate: true,
    });
    let parsedStepDiff;
    if (parsedStep.length && parsedStep[0]?.start) {
      parsedStepDiff = +parsedStep[0]?.start.date() - command.createdTimestamp;
      if (
        step &&
        parsedStepDiff > 0 &&
        parsedStepDiff < 120_000 &&
        !command.author.isSuperuser()
      )
        return await command.error("REMINDER_STEP_TOO_SHORT", {
          includeSlashUpsell: true,
        });
    }

    // check time limits
    const reminderDayjs = dayjs(reminder.date);
    if (
      reminderDayjs.diff(command.createdAt, "minutes") < 2 &&
      !command.author.isSuperuser()
    )
      return await command.error("REMINDER_TOO_SHORT", {
        includeSlashUpsell: true,
      });
    const largestTime =
      +reminder.date + (parsedStepDiff ? parsedStepDiff * repeat : 0);
    if (
      dayjs(largestTime).diff(command.createdAt, "years") > 2 &&
      !command.author.isSuperuser()
    )
      return await command.error("REMINDER_TIME_LIMIT", {
        includeSlashUpsell: true,
      });

    // actually start setting the reminder
    let created: { [duration: string]: boolean } = {};
    let latestTime = +reminder.date;
    for (let i = 0; i < repeat; i++) {
      const current = new Date(latestTime);
      const remind = await command.author.createReminder(
        current,
        reminder.text,
        command.url
      );
      created[Formatters.time(current, "R")] = remind;
      latestTime += parsedStepDiff;
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
