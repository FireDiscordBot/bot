import { ArgumentTypeCaster } from "discord-akairo";
import { FireMessage } from "../../lib/extensions/message";
import { memberConverter } from "../../lib/util/converters";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireUser } from "../../lib/extensions/user";

export const memberTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | FireUser | null> => {
  return !phrase
    ? message.member || message.author
    : await memberConverter(message, phrase);
};
