import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { ArgumentTypeCaster } from "discord-akairo";

export const languageTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Language | null => message.client.getLanguage(phrase);
