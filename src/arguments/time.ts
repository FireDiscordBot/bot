import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { classicRemind, constants } from "@fire/lib/util/constants";
import { ParsedResult, casual } from "chrono-node";
import * as dayjs from "dayjs";
import { ArgumentTypeCaster } from "discord-akairo";

const {
  regexes: { time },
} = constants;

export type ParsedTime = { text: string; date: Date };

export const timeTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
) => {
  const content = phrase.trim();
  return parseTime(
    content,
    message.createdAt,
    message.author.settings.get<string>("reminders.timezone.iana", "Etc/UTC"),
    message
  );
};

const doubledUpWhitespace = /\s{2,}/g;

export const parseTime = (
  text: string,
  instant: Date,
  IANA: string,
  context: FireMessage | ApplicationCommandMessage | ContextCommandMessage
) => {
  text = text.trim();
  let useClassic = false;
  for (const regex of Object.values(time)) {
    if (Array.isArray(regex)) continue;
    if (regex.test(text))
      useClassic = context.author.hasExperiment(2760158308, 1);
    regex.lastIndex = 0;
  }
  let parsed: ParsedResult[];
  if (useClassic)
    parsed = classicRemind.parse(text, { instant }, { forwardDate: true });
  else {
    // Get the date first, doesn't need to be exact with timing since we only want it to get the offset
    // This will probably break if you try to set a reminder around the switch to/from DST
    // but if you're doing that, fuck you.
    // timezones suck, daylight savings sucks more
    const preliminaryParse = casual.parse(
      text,
      { instant },
      { forwardDate: true }
    );
    const date = preliminaryParse[0]?.start.date();
    if (!date) return null;
    let offset: number;
    if (preliminaryParse[0].start.get("timezoneOffset") == null) {
      // Instead of the old offset we got from browsers, we'll use an IANA timezone name
      // and that + the date from above allows us to get the correct offset for DST
      date.setHours(23, 59, 59, 999); // should be past the dst switch in most timezones
      offset = dayjs.tz(date, IANA).utcOffset();
    }
    // This means a timezone was specified in the text so we'll use that
    else offset = preliminaryParse[0].start.get("timezoneOffset");

    parsed = casual.parse(
      text,
      { instant, timezone: offset },
      { forwardDate: true }
    );
  }
  if (!parsed.length) return null;

  // idk why but "they" results in a match for a year in the future
  // so we'll just filter it out (and any other weird matches that come up)
  parsed = parsed.filter((v) => v.text != "they");

  const foundTimes = parsed[0].text.split(",");
  for (const time of foundTimes) text = text.replace(time, "");
  text = text.replace(doubledUpWhitespace, " ").trim();
  return { text: text, date: parsed[0].start.date() };
};

export const parseWithUserTimezone = (
  text: string,
  instant: Date,
  IANA: string
) => {
  // Get the date first, doesn't need to be exact with timing since we only want it to get the offset
  // This will probably break if you try to set a reminder around the switch to/from DST
  // but if you're doing that, fuck you.
  // timezones suck, daylight savings sucks more
  const preliminaryParse = casual.parse(
    text,
    { instant },
    {
      forwardDate: true,
    }
  );
  let offset: number = 0;
  const date = preliminaryParse[0]?.start.date();
  if (date) {
    if (preliminaryParse[0].start.get("timezoneOffset") == null) {
      // Instead of the old offset we got from browsers, we'll use an IANA timezone name
      // and that + the date from above allows us to get the correct offset for DST
      date.setHours(23, 59, 59, 999); // should be past the dst switch in most timezones
      offset = dayjs.tz(date, IANA).utcOffset();
    }
    // This means a timezone was specified in the text so we'll use that
    else offset = preliminaryParse[0].start.get("timezoneOffset");
  } else offset = dayjs.tz(+new Date(), IANA).utcOffset();

  return {
    preliminaryParsedDate: date,
    parsed: casual.parse(
      text,
      { instant, timezone: offset },
      {
        forwardDate: true,
      }
    ),
  };
};
