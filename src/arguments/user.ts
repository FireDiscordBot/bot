import { ArgumentTypeCaster } from "discord-akairo";
import { FireMessage } from "../../lib/extensions/message";
import { userConverter } from "../../lib/util/converters";
import { FireUser } from "../../lib/extensions/user";

export const userTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireUser | null> => userConverter(message, phrase);
