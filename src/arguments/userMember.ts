import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { memberConverter, userConverter } from "@fire/lib/util/converters";
import { ArgumentTypeCaster } from "discord-akairo";

export const userMemberTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | FireUser | null> => {
  const member = await memberConverter(message, phrase, true);
  return member ? member : await userConverter(message, phrase);
};
