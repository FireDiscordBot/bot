import { FireMessage } from "../../lib/extensions/message";
import { roleConverter } from "../../lib/util/converters";
import { ArgumentTypeCaster } from "discord-akairo";
import { Role } from "discord.js";

export const roleTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<Role | null> => roleConverter(message, phrase);

export const roleSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<Role | null> => roleConverter(message, phrase, true);