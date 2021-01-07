import {
  roleConverter,
  memberConverter,
  textChannelConverter,
  categoryChannelConverter,
} from "../../lib/util/converters";
import { CategoryChannel, TextChannel, Role } from "discord.js";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";

export const memberRoleChannelCategoryTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | Role | TextChannel | CategoryChannel | null> => {
  const member = await memberConverter(message, phrase, true);
  if (member) return member;
  const role = await roleConverter(message, phrase, true);
  if (role) return role;
  const channel = await textChannelConverter(message, phrase, true);
  if (channel) return channel;
  const category = await categoryChannelConverter(message, phrase, true);
  if (category) return category;
  if (phrase) {
    await message.error("INVALID_MEMBER_ROLE_CHANNEL");
    return null;
  }
};
