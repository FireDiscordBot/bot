import { FireGuild } from "@fire/lib/extensions/guild";

export interface MessageLinkMatch {
  message_id: string;
  channel_id: string;
  guild_id: string;
}

export interface PartialQuoteDestination {
  fetchWebhooks?: never;
  createWebhook?: never;
  permissions: string;
  guild_id?: string;
  guild?: FireGuild;
  nsfw: boolean;
  name?: never;
  id: string;
}
