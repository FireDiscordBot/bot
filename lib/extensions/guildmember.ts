import { Structures, GuildMember, Channel } from "discord.js";
import { UserSettings } from "../util/settings";
import * as sanitizer from "@aero/sanitizer";
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
    if (this.isAdmin(channel)) return true;
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

  get hoisted() {
    const badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (this.nickname && this.nickname == badName)
      return this.user.username[0] < "0";
    return this.displayName[0] < "0";
  }

  get cancerous() {
    const badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (this.nickname && this.nickname == badName)
      return !this.client.util.isASCII(this.user.username);
    return !this.client.util.isASCII(this.displayName);
  }

  async dehoist() {
    if (this.isModerator()) return;
    if (!this.guild.settings.get("mod.autodehoist")) return;
    const badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (!this.hoisted && !this.cancerous && this.nickname == badName)
      return await this.setNickname(
        null,
        this.guild.language.get("AUTODEHOIST_RESET_REASON") as string
      ).catch(() => false);
    else if (!this.hoisted) return;
    if (this.hoisted && !this.user.hoisted && !this.cancerous) {
      return await this.setNickname(
        null,
        this.guild.language.get("AUTODEHOIST_USERNAME_REASON") as string
      ).catch(() => false);
    }
    if (this.displayName == badName) return;
    try {
      return await this.setNickname(
        badName,
        this.guild.language.get("AUTODEHOIST_REASON") as string
      );
    } catch (e) {
      return false;
    }
  }

  async decancer() {
    if (this.isModerator()) return;
    if (!this.guild.settings.get("mod.autodecancer")) return;
    let badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (!this.cancerous && !this.hoisted && this.nickname == badName)
      return await this.setNickname(
        null,
        this.guild.language.get("AUTODECANCER_RESET_REASON") as string
      ).catch(() => false);
    else if (!this.cancerous) return;
    if (this.cancerous && !this.user.cancerous && !this.hoisted) {
      return await this.setNickname(
        null,
        this.guild.language.get("AUTODECANCER_USERNAME_REASON") as string
      ).catch(() => false);
    }
    if (this.displayName == badName) return;
    const sanitized: string = sanitizer(this.displayName);
    if (
      sanitized.length > 2 &&
      sanitized.length < 32 &&
      sanitized != "gibberish"
    )
      badName = sanitized;
    try {
      return await this.setNickname(
        badName,
        this.guild.language.get("AUTODECANCER_REASON") as string
      );
    } catch (e) {
      return false;
    }
  }

  isSuperuser() {
    return this.settings.get("utils.superuser", false);
  }
}

Structures.extend("GuildMember", () => FireMember);
