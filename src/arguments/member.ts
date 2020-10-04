import { ArgumentTypeCaster } from "discord-akairo";
import { FireMessage } from "../../lib/extensions/message";
import { memberConverter } from "../../lib/util/converters";
import { FireMember } from "../../lib/extensions/guildmember";

export const memberTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireMember | null> => memberConverter(message, phrase);
