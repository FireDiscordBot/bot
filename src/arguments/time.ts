import { FireMessage } from "@fire/lib/extensions/message";
import { classicRemind, constants } from "@fire/lib/util/constants";
import { ParsedResult, casual } from "chrono-node";
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
    message.author.settings.get("reminders.timezone.offset", 0)
  );
};

const doubledUpWhitespace = /\s{2,}/g;

export const parseTime = (text: string, instant: Date, offset: number) => {
  text = text.trim();
  let useClassic = false;
  for (const regex of Object.values(time)) {
    if (Array.isArray(regex)) continue;
    if (regex.test(text)) useClassic = true;
    regex.lastIndex = 0;
  }
  let parsed: ParsedResult[];
  if (useClassic)
    parsed = classicRemind.parse(text, { instant }, { forwardDate: true });
  else
    parsed = casual.parse(
      text,
      { instant, timezone: offset },
      { forwardDate: true }
    );
  if (!parsed.length) return null;
  const foundTimes = parsed[0].text.split(",");
  for (const time of foundTimes) text = text.replace(time, "");
  text = text.replace(doubledUpWhitespace, " ");
  return { text: text.trim(), date: parsed[0].start.date() };
};
