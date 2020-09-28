import { ArgumentTypeCaster } from "discord-akairo";
import { FireMessage } from "../../lib/extensions/message";
import { userConverter } from "../../lib/util/converters";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireUser } from "../../lib/extensions/user";

export const userTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | FireUser | null> => {
  return !phrase
    ? message.member || message.author
    : await userConverter(message, phrase);
};
