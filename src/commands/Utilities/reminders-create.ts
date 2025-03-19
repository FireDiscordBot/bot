import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { classicRemind, constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { ParsedTime, parseWithUserTimezone } from "@fire/src/arguments/time";
import { ParsedResult, strict } from "chrono-node";
import * as dayjs from "dayjs";
import { Snowflake } from "discord-api-types/globals";
import {
  Collection,
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
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
        label: context.author.language.get(
          key as keyof typeof reminderContextTimes
        ),
        value:
          typeof time == "number"
            ? (context.createdTimestamp + time).toString()
            : time,
      };
    });
};

type ClickedMessage = { message: FireMessage; clickedAt: number };

export default class RemindersCreate extends Command {
  repeatRegex = /--repeat (\d*)/gim;
  stepRegex = /--step ([^-]*)/gim;
  recentlyClicked: Collection<Snowflake, ClickedMessage>;

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

    this.recentlyClicked = new Collection();
    setInterval(
      () =>
        this.recentlyClicked.sweep((m) => +new Date() - m.clickedAt >= 300_000),
      30_000
    );
  }

  async run(
    // FireMessage is here to allow for the --remind flag
    command: ApplicationCommandMessage | ContextCommandMessage | FireMessage,
    args: { reminder: ParsedTime; repeat: number; step: string }
  ) {
    if (
      !(command instanceof FireMessage) &&
      !(
        command instanceof ContextCommandMessage
          ? command.contextCommand
          : command.slashCommand
      ).authorizingIntegrationOwners.includes(command.author.id) &&
      command.hasExperiment(3028355873, 1)
    )
      return await command.error("REMINDER_NOT_AUTHORIZED_USER_APP", {
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setStyle("LINK")
              .setLabel(command.language.get("ADD_USER_APP"))
              .setURL(
                `https://discord.com/oauth2/authorize?client_id=${this.client.user.id}&integration_type=1&scope=applications.commands`
              )
          ),
        ],
      });

    if (
      command.author.settings.has("reminders.dms_closed_fail") &&
      command.author.settings.get("reminders.dms_closed_fail") == true
    ) {
      let timeout: number;
      if (!command.author.settings.has("reminders.dms_closed_fail.timeout")) {
        timeout = +new Date() + 30_000;
        setTimeout(() => {
          // we delete the key so that the next invocation will work
          // but we give it a delay so they have time to read the message
          // and either enable DMs or add the app
          command.author.settings.delete("reminders.dms_closed_fail");
          command.author.settings.delete("reminders.dms_closed_fail.timeout");
        }, 30_000);
        await command.author.settings.set(
          "reminders.dms_closed_fail.timeout",
          timeout
        );
      } else
        timeout = command.author.settings.get<number>(
          "reminders.dms_closed_fail.timeout"
        );
      return await command.error("REMINDER_FAILURE_DM_CLOSED", {
        timeout: Formatters.time(Math.ceil(timeout / 1000), "R"),
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setStyle("LINK")
              .setLabel(command.language.get("ADD_USER_APP"))
              .setURL(
                `https://discord.com/oauth2/authorize?client_id=${this.client.user.id}&integration_type=1&scope=applications.commands`
              )
          ),
        ],
      });
    }

    // handle context menu before actual command
    if (command instanceof ContextCommandMessage) {
      const clickedMessage = (
        command as ContextCommandMessage
      ).getMessage() as FireMessage;
      if (!clickedMessage?.content)
        return await command.error("REMINDER_MISSING_CONTEXT");

      const now = +new Date();

      if (!this.client.guilds.cache.has(command.guildId))
        // we need this to get the data for setting the reminder
        // since we can't fetch the message in future interactions
        // and will overwrite the previous one if it exists
        // with new data & new timestamp
        this.recentlyClicked.set(clickedMessage.id, {
          message: clickedMessage,
          clickedAt: now,
        });

      // Parse with chrono-node early so we can get the content without the time
      let { parsed, preliminaryParsedDate: date } = parseWithUserTimezone(
          clickedMessage.content,
          clickedMessage.createdAt,
          // we can't use FireUser#timezone for clickedMessage.author here
          // as we don't want to have Etc/UTC returned as a default
          // but instead use the command author's timezone and then
          // fallback to Etc/UTC if they *also* don't have a timezone set
          clickedMessage.author.settings.get<string>(
            "timezone.iana",
            command.author.timezone
          )
        ),
        useEmbedDescription = false;
      if (
        !parsed.length &&
        clickedMessage.embeds.length &&
        clickedMessage.content
          .replaceAll("x.com", "twitter.com")
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
                  "timezone.iana",
                  command.author.timezone
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
      // event.sent.push({
      //   user: command.author.id,
      //   text: reminderText,
      //   link: clickedMessage.url,
      //   timestamp: now,
      // });

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
        if (video) {
          // We'll replace the link with the title regardless of
          // whether or not it is upcoming since we have the data anyways
          reminderText = clickedMessage.content.replace(
            ytVideos[0],
            `[${video.snippet.title}](<https://youtu.be/${video.id}>)`
          );
          if (
            video.snippet?.liveBroadcastContent == "upcoming" &&
            video.liveStreamingDetails?.scheduledStartTime
          ) {
            const scheduledStartTime = +new Date(
              video.liveStreamingDetails.scheduledStartTime
            );
            if (scheduledStartTime > now) {
              const blankShortLabel = command.language.get(
                "REMINDER_YOUTUBE_PREMIERE",
                {
                  title: "",
                }
              );
              const titleShort = this.client.util.shortenText(
                video.snippet.title,
                100 - blankShortLabel.length
              );
              const blankLongLabel = command.language.get(
                // 5 mins loses 1 character but effort of special casing it
                // so we use the 30 mins label since that'll also work for 15
                "REMINDER_YOUTUBE_PREMIERE_30_MINS",
                {
                  title: "",
                }
              );
              const titleShorter = this.client.util.shortenText(
                video.snippet.title,
                100 - blankLongLabel.length
              );
              const ytOptions = [
                {
                  label: command.language.get("REMINDER_YOUTUBE_PREMIERE", {
                    title: titleShort,
                  }),
                  value: scheduledStartTime.toString(),
                },
                {
                  label: command.language.get(
                    "REMINDER_YOUTUBE_PREMIERE_5_MINS",
                    {
                      title: titleShorter,
                    }
                  ),
                  value: (scheduledStartTime - 300000).toString(),
                },
                {
                  label: command.language.get(
                    "REMINDER_YOUTUBE_PREMIERE_15_MINS",
                    {
                      title: titleShorter,
                    }
                  ),
                  value: (scheduledStartTime - 900000).toString(),
                },
                {
                  label: command.language.get(
                    "REMINDER_YOUTUBE_PREMIERE_30_MINS",
                    {
                      title: titleShorter,
                    }
                  ),
                  value: (scheduledStartTime - 1800000).toString(),
                },
              ];
              if (parsed.length) droptions.unshift(...ytOptions);
              else droptions = ytOptions;
            }
          }
        }
      }

      // Create the components
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          command.author.language.get("REMINDER_CONTEXT_PLACEHOLDER")
        )
        // context snooze bypasses component & author checks
        // since those only apply to normal snoozing
        .setCustomId(`!snooze:${command.author.id}:${now}:context`)
        .setMinValues(1)
        .addOptions(
          droptions.filter((o) => o.value == "other" || +o.value > now)
        );
      if (!parsed.length) dropdown.setMaxValues(1);
      const cancelButton = new MessageButton()
        .setEmoji("534174796938870792")
        .setStyle("DANGER")
        .setCustomId("!reminders_context_cancel");

      return await command.channel.send({
        content:
          command.author.language.get(
            parsed.length
              ? clickedMessage.author.settings.has("timezone.iana")
                ? clickedMessage.author.id == command.author.id
                  ? command.author.settings.has("timezone.iana")
                    ? "REMINDER_CONTEXT_CONTENT_NO_TZ"
                    : "REMINDER_CONTEXT_CONTENT"
                  : "REMINDER_CONTEXT_CONTENT_WITH_AUTHOR_TZ"
                : command.author.settings.has("timezone.iana")
                ? "REMINDER_CONTEXT_CONTENT_NO_TZ"
                : "REMINDER_CONTEXT_CONTENT"
              : "REMINDER_CONTEXT_CONTENT_NO_TZ",
            {
              content:
                reminderText.length >= 503
                  ? reminderText.slice(0, 500) + "..."
                  : reminderText,
              author: clickedMessage.author.toString(),
            }
          ) +
          (!this.client.guilds.cache.has(command.guildId)
            ? `\n${command.author.language.get(
                "REMINDER_CONTEXT_TEMPORARY_WARNING"
              )}`
            : ""),
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
    else if (reminder.text.length > 4000)
      return await command.error("REMINDER_CONTENT_TOO_LONG", {
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
      : await command.error("REMINDER_CREATION_FAILED", {
          includeSlashUpsell: true,
        });
  }
}
