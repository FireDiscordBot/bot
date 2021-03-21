import {
  roleConverter,
  memberConverter,
  textChannelConverter,
  categoryChannelConverter,
} from "@fire/lib/util/converters";
import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { CategoryChannel, Role } from "discord.js";

export const memberRoleChannelCategoryTypeCaster: ArgumentTypeCaster = async (
  message: FireMessage,
  phrase
): Promise<FireMember | Role | FireTextChannel | CategoryChannel | null> => {
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
