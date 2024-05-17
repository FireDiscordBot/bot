import { FireMessage } from "@fire/lib/extensions/message";
import { categoryChannelConverter } from "@fire/lib/util/converters";
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
