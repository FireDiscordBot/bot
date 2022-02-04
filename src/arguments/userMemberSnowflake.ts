import {
  userConverter,
  memberConverter,
  snowflakeConverter,
} from "@fire/lib/util/converters";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { DeconstructedSnowflake, Snowflake } from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";

export const userMemberSnowflakeTypeCaster = async (
  message: FireMessage | ApplicationCommandMessage,
  phrase
): Promise<
  | FireMember
  | FireUser
  | ({ snowflake: Snowflake } & DeconstructedSnowflake)
  | null
> => {
  const member = await memberConverter(message, phrase, true);
  if (member) return member;
  const user = await userConverter(message, phrase, true);
  if (user) return user;
  const snowflake = await snowflakeConverter(message, phrase);
  if (snowflake) return snowflake;
  if (phrase) return null;
};
