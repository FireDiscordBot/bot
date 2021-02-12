import { FireMessage } from "@fire/lib/extensions/message";
import { userConverter } from "@fire/lib/util/converters";
import { FireUser } from "@fire/lib/extensions/user";
import { ArgumentTypeCaster } from "discord-akairo";

export const userTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireUser | null> => userConverter(message, phrase);

export const userSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireUser | null> => userConverter(message, phrase, true);
