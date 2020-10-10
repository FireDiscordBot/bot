import { memberConverter, userConverter } from "../../lib/util/converters";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { FireUser } from "../../lib/extensions/user";
import { ArgumentTypeCaster } from "discord-akairo";

export const userMemberTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | FireUser | null> => {
  const member = await memberConverter(message, phrase, true);
  return member ? member : await userConverter(message, phrase);
};
