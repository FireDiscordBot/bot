import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { memberConverter } from "@fire/lib/util/converters";
import { ArgumentTypeCaster } from "discord-akairo";

export const memberTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireMember | null> => memberConverter(message, phrase);

export const memberSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireMember | null> => memberConverter(message, phrase, true);
