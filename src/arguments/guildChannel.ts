import { guildChannelConverter } from "../../lib/util/converters";
import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { GuildChannel } from "discord.js";

export const guildChannelTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<GuildChannel | null> => guildChannelConverter(message, phrase);

export const guildChannelSilentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Promise<GuildChannel | null> => guildChannelConverter(message, phrase, true);
