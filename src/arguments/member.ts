import { FireMember } from "../../lib/extensions/guildmember";
import { memberConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";

export const memberTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<FireMember | null> => memberConverter(message, phrase);
