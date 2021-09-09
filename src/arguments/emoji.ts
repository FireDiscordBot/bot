import { FireMessage } from "@fire/lib/extensions/message";
import { emojiConverter } from "@fire/lib/util/converters";
import { ArgumentTypeCaster } from "discord-akairo";
import { Emoji } from "discord.js";

export const emojiTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<Emoji | string | null> => emojiConverter(message, phrase);
