import { FireMessage } from "../../lib/extensions/message";
import { userConverter } from "../../lib/util/converters";
import { FireUser } from "../../lib/extensions/user";
import { ArgumentTypeCaster } from "discord-akairo";

export const userTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireUser | null> => userConverter(message, phrase);

export const userSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireUser | null> => userConverter(message, phrase, true);
