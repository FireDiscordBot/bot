import { ArgumentTypeCaster } from "discord-akairo";
import { memberConverter, roleConverter } from "../../lib/util/converters";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { Role } from "discord.js";

export const memberRoleTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | Role | null> => {
  const member = await memberConverter(message, phrase, true);
  return member ? member : await roleConverter(message, phrase, true);
};
