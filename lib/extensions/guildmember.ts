import { Structures, GuildMember, Channel } from "discord.js";
import { UserSettings } from "../util/settings";
import { Language } from "../util/language";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

export class FireMember extends GuildMember {
  client: Fire;
  guild: FireGuild;
  user: FireUser;
  settings: UserSettings;
  language: Language;

  constructor(client: Fire, data: object, guild: FireGuild) {
    super(client, data, guild);
    this.settings = this.user.settings;
    this.language = this.user.language;
  }

  toString() {
    return `${this.user.username}#${this.user.discriminator}`;
  }

  toMention() {
    return super.toString();
  }

  isModerator(channel?: Channel) {
    if (this.permissionsIn(channel).has("ADMINISTRATOR")) return true;
    const moderators = this.guild.settings.get(
      "utils.moderators",
      []
    ) as string[];
    let isMod = false;
    if (moderators.length) {
      if (moderators.includes(this.id)) isMod = true;
      else if (
        this.roles.cache.filter((role) => moderators.includes(role.id)).size
      )
        isMod = true;
    } else if (
      channel
        ? this.permissionsIn(channel).has("MANAGE_MESSAGES")
        : this.permissions.has("MANAGE_MESSAGES")
    ) {
      isMod = true;
    }
    return isMod;
  }

  isAdmin(channel?: Channel) {
    return channel
      ? this.permissionsIn(channel).has("MANAGE_GUILD")
      : this.permissions.has("MANAGE_GUILD");
  }

  async blacklist(reason: string, permanent: boolean) {
    return await this.client.util.blacklist(this, reason, permanent);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }

  hasExperiment(id: string, treatmentId?: number) {
    return this.user.hasExperiment(id, treatmentId);
  }

  giveExperiment(id: string, treatmentId: number) {
    return this.user.giveExperiment(id, treatmentId);
  }

  removeExperiment(id: string) {
    return this.user.removeExperiment(id);
  }
}

Structures.extend("GuildMember", () => FireMember);
