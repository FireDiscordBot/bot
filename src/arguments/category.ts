import { categoryChannelConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { CategoryChannel } from "discord.js";

export const categoryChannelTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<CategoryChannel | null> => categoryChannelConverter(message, phrase);

export const categoryChannelSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<CategoryChannel | null> =>
  categoryChannelConverter(message, phrase, true);
