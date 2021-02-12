import {
  roleConverter,
  memberConverter,
  textChannelConverter,
} from "@fire/lib/util/converters";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { TextChannel, Role } from "discord.js";

export const memberRoleChannelTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | Role | TextChannel | null> => {
  const member = await memberConverter(message, phrase, true);
  if (member) return member;
  const role = await roleConverter(message, phrase, true);
  if (role) return role;
  const channel = await textChannelConverter(message, phrase, true);
  if (channel) return channel;
  if (phrase) {
    await message.error("INVALID_MEMBER_ROLE_CHANNEL");
    return null;
  }
};
