import { ArgumentTypeCaster } from "discord-akairo";
import { FireMessage } from "../../lib/extensions/message";
import { memberConverter, userConverter } from "../../lib/util/converters";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireUser } from "../../lib/extensions/user";

export const userMemberTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | FireUser | null> => {
  if (!phrase) {
    return message.member || message.author;
  }
  const member = await memberConverter(message, phrase, true);
  return member ? member : await userConverter(message, phrase);
};
