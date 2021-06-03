import { FireGuild } from "@fire/lib/extensions/guild";
import { Snowflake } from "discord.js";

export interface MessageLinkMatch {
  message_id: Snowflake;
  channel_id: Snowflake;
  guild_id: Snowflake;
}

export interface PartialQuoteDestination {
  permissions: string;
  guild_id?: Snowflake;
  guild?: FireGuild;
  nsfw: boolean;
  id: string;
}
