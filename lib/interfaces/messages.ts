import { FireGuild } from "@fire/lib/extensions/guild";
import { Snowflake } from "discord-api-types/globals";
import { FireMessage } from "../extensions/message";

export interface MessageLinkMatch {
  message_id: Snowflake;
  end_message_id?: Snowflake;
  iteratedMessages?: FireMessage[];
  channel_id: Snowflake;
  end_channel_id?: Snowflake;
  guild_id: Snowflake;
  end_guild_id?: Snowflake;
  channel?: string;
}

export interface PartialQuoteDestination {
  fetchWebhooks?: never;
  createWebhook?: never;
  permissions: string;
  guild_id?: Snowflake;
  guild?: FireGuild;
  nsfw: boolean;
  name?: never;
  id: string;
}
