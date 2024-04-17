import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { classicRemind, constants } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { EventType } from "@fire/lib/ws/util/constants";
import { ParsedTime, parseWithUserTimezone } from "@fire/src/arguments/time";
import ReminderSendEvent from "@fire/src/ws/events/ReminderSendEvent";
import { ParsedResult, strict } from "chrono-node";
import * as dayjs from "dayjs";
import {
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  SnowflakeUtil,
} from "discord.js";

const { regexes } = constants;

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
// const doubledUpWhitespace = /\s{2,}/g;

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
      let { parsed, preliminaryParsedDate: date } = parseWithUserTimezone(
          clickedMessage.content,
          clickedMessage.createdAt,
          clickedMessage.author.settings.get<string>(
            "reminders.timezone.iana",
            "Etc/UTC"
          )
        ),
        useEmbedDescription = false;
      if (
        !parsed.length &&
        clickedMessage.embeds.length &&
        clickedMessage.content
          .replace("x.com", "twitter.com")
          .includes(clickedMessage.embeds[0].url) &&
        clickedMessage.embeds[0].description
      )
        // possibly a linked tweet or other social media post, use that instead
        (parsed = strict.parse(
          clickedMessage.embeds[0].description,
          {
            instant: clickedMessage.embeds[0].timestamp
              ? new Date(clickedMessage.embeds[0].timestamp)
              : clickedMessage.createdAt,
            timezone: dayjs
              .tz(
                date,
                clickedMessage.author.settings.get<string>(
                  "reminders.timezone.iana",
                  "Etc/UTC"
                )
              )
              .utcOffset(),
          },
          {
            forwardDate: true,
          }
        )),
          (useEmbedDescription = true);
      parsed = parsed
        // Remove timex in the past, based on command reaction (probably not too far off current time)
        .filter((res) => res.start.date() > command.createdAt)
        // Remove duplicate times (e.g. when the same time is mentioned in multiple timezones)
        .filter(
          (res, index, self) =>
            self.findIndex((r) => +r.start.date() == +res.start.date()) == index
        );
      let reminderText = useEmbedDescription
        ? clickedMessage.embeds[0].description
        : clickedMessage.content;
      // for (const result of parsed)
      //   reminderText = reminderText.replace(result.text, "");
      // reminderText = reminderText.replace(doubledUpWhitespace, " ").trim();

      // we push a dummy reminder that we use for "snoozing"
      event.sent.push({
        user: command.author.id,
        text: reminderText,
        link: clickedMessage.url,
        timestamp: now,
      });

      let droptions = getContextOptions(parsed, command);

      // Find a YouTube video, check if premiere/scheduled livestream
      // idt this warrants supporting multiple links so it'll only do the first match
      const ytVideos = regexes.youtube.video.exec(clickedMessage.content);
      regexes.youtube.video.lastIndex = 0;
      if (ytVideos && ytVideos.groups?.video) {
        const video = await this.client.util
          .getYouTubeVideo([ytVideos.groups.video])
          .then((v) => {
            if (v && v.items.length) return v.items[0];
            else return false;
          })
          .catch(() => {});
        if (
          video &&
          video.snippet?.liveBroadcastContent == "upcoming" &&
          video.liveStreamingDetails?.scheduledStartTime
        ) {
          reminderText = reminderText.replace(ytVideos[0], video.snippet.title);
          const titleShort =
            video.snippet.title.slice(0, 37) +
            (video.snippet.title.length > 37 ? "..." : "");
          const titleShorter =
            video.snippet.title.slice(0, 24) +
            (video.snippet.title.length > 24 ? "..." : "");
          const scheduledStartTime = +new Date(
            video.liveStreamingDetails.scheduledStartTime
          );
          const ytOptions = [
            {
              label: command.language.get("REMINDER_YOUTUBE_PREMIERE", {
                title: titleShort,
              }),
              value: scheduledStartTime.toString(),
            },
            {
              label: command.language.get("REMINDER_YOUTUBE_PREMIERE_5_MINS", {
                title: titleShorter,
              }),
              value: (scheduledStartTime - 300000).toString(),
            },
            {
              label: command.language.get("REMINDER_YOUTUBE_PREMIERE_15_MINS", {
                title: titleShorter,
              }),
              value: (scheduledStartTime - 900000).toString(),
            },
            {
              label: command.language.get("REMINDER_YOUTUBE_PREMIERE_30_MINS", {
                title: titleShorter,
              }),
              value: (scheduledStartTime - 1800000).toString(),
            },
          ];
          if (parsed.length) droptions.unshift(...ytOptions);
          else droptions = ytOptions;
        }
      }

      // Create the components
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          command.author.language.get("REMINDER_CONTEXT_PLACEHOLDER")
        )
        .setCustomId(`!snooze:${command.author.id}:${now}`)
        .setMinValues(1)
        .addOptions(droptions);
      if (!parsed.length) dropdown.setMaxValues(1);
      const cancelSnowflake = SnowflakeUtil.generate();
      const cancelButton = new MessageButton()
        .setEmoji("534174796938870792")
        .setStyle("DANGER")
        .setCustomId(`!${cancelSnowflake}`);
      this.client.buttonHandlersOnce.set(cancelSnowflake, (b) => {
        event.sent = event.sent.filter((r) => r.timestamp != now);
        b.channel.update({
          content: command.language.get("REMINDER_CONTEXT_CANCELLED"),
          components: [],
        });
      });

      return await command.channel.send({
        content: command.author.language.get(
          parsed.length
            ? clickedMessage.author.settings.has("reminders.timezone.iana")
              ? clickedMessage.author.id == command.author.id
                ? "REMINDER_CONTEXT_CONTENT_NO_TZ"
                : "REMINDER_CONTEXT_CONTENT_WITH_AUTHOR_TZ"
              : "REMINDER_CONTEXT_CONTENT"
            : "REMINDER_CONTEXT_CONTENT_NO_TZ",
          {
            content:
              reminderText.length >= 503
                ? reminderText.slice(0, 500) + "..."
                : reminderText,
            author: clickedMessage.author.toString(),
          }
        ),
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
    if (!reminder?.text?.length || !reminder?.date)
      return await command.error("REMINDER_MISSING_ARG", {
        includeSlashUpsell: true,
      });
    else if (reminder.date < command.createdAt)
      return await command.error("REMINDER_PAST_TIME", {
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
        command.createdTimestamp,
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
