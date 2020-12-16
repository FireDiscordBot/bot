import { FireGuild } from "../extensions/guild";

export interface MessageLinkMatch {
  message_id: string;
  channel_id: string;
  guild_id: string;
}

export interface PartialQuoteDestination {
  nsfw: boolean;
  guild?: FireGuild;
}
