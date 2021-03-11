import { FireGuild } from "@fire/lib/extensions/guild";

export interface MessageLinkMatch {
  message_id: string;
  channel_id: string;
  guild_id: string;
}

export interface PartialQuoteDestination {
  permissions: number;
  guild_id?: string;
  guild?: FireGuild;
  nsfw: boolean;
  id: string;
}
