import { Snowflake } from "discord-api-types/globals";
import { ImageURLOptions } from "discord.js";
import { FireGuild } from "../extensions/guild";
import { FireUser } from "../extensions/user";

type PrimaryGuildData = {
  identity_guild_id: Snowflake;
  identity_enabled: boolean;
  tag: string;
  badge: string;
};

export class PrimaryGuild {
  readonly user: FireUser;
  guildId: Snowflake;
  tag: string;
  badge: string;

  constructor(data: PrimaryGuildData, user: FireUser) {
    this.user = user;
    this.guildId = data.identity_guild_id;
    this.tag = data.tag;
    this.badge = data.badge;
  }

  get guild() {
    return this.guildId
      ? (this.user.client.guilds.cache.get(this.guildId) as FireGuild)
      : null;
  }

  _patch(data: PrimaryGuildData) {
    if (data.tag) this.tag = data.tag;
    if (data.badge) this.badge = data.badge;
    if (data.identity_guild_id) this.guildId = data.identity_guild_id;
  }

  badgeURL({ size }: ImageURLOptions) {
    return `${this.user.client.options.http.cdn}/clan-badges/${this.guildId}/${
      this.badge
    }.png${size ? `?size=${size}` : ""}`;
  }
}
