import { messageConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";

export const messageTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireMessage | "cross_cluster" | null> =>
  messageConverter(message, phrase);
