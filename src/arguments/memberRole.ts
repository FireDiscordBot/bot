import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { memberConverter, roleConverter } from "@fire/lib/util/converters";
import { ArgumentTypeCaster } from "discord-akairo";
import { Role } from "discord.js";

export const memberRoleTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | Role | null> => {
  const member = await memberConverter(message, phrase, true);
  return member ? member : await roleConverter(message, phrase, true);
};
