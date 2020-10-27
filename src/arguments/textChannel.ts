import { textChannelConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { TextChannel } from "discord.js";

export const textChannelTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<TextChannel | null> => textChannelConverter(message, phrase);

export const textChannelSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<TextChannel | null> => textChannelConverter(message, phrase, true);
