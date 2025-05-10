import { ImageURLOptions } from "discord.js";
import { FireGuild } from "../extensions/guild";

type GuildProfileData = {
  tag: string;
  badge: string;
};

export class GuildProfile {
  readonly guild: FireGuild;
  tag: string;
  badge: string;

  constructor(data: GuildProfileData, guild: FireGuild) {
    this.tag = data.tag;
    this.badge = data.badge;
    this.guild = guild;
  }

  _patch(data: GuildProfileData) {
    if (data.tag) this.tag = data.tag;
    if (data.badge) this.badge = data.badge;
  }

  badgeURL({ size }: ImageURLOptions) {
    return `${this.guild.client.options.http.cdn}/clan-badges/${
      this.guild.id
    }/${this.badge}.png${size ? `?size=${size}` : ""}`;
  }
}
