import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { textChannelConverter } from "@fire/lib/util/converters";
import { ArgumentTypeCaster } from "discord-akairo";

export const textChannelTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireTextChannel | null> => textChannelConverter(message, phrase);

export const textChannelSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireTextChannel | null> =>
  textChannelConverter(message, phrase, true);
