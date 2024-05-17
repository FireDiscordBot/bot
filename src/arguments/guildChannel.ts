import { FireMessage } from "@fire/lib/extensions/message";
import { guildChannelConverter } from "@fire/lib/util/converters";
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
