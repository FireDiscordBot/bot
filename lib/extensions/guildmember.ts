import {
  MessageEmbed,
  GuildMember,
  TextChannel,
  Structures,
  Channel,
  Util,
} from "discord.js";
import { FakeChannel } from "./slashCommandMessage";
import * as sanitizer from "@aero/sanitizer";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

export class FireMember extends GuildMember {
  guild: FireGuild;
  pending: boolean;
  user: FireUser;
  client: Fire;

  constructor(client: Fire, data: object, guild: FireGuild) {
    super(client, data, guild);
    // @ts-ignore
    this.pending = data?.pending ?? false;
  }

  get language() {
    return this.user.language;
  }

  get settings() {
    return this.user.settings;
  }

  toString() {
    return `${this.user.username}#${this.user.discriminator}`;
  }

  toMention() {
    return super.toString();
  }

  _patch(data: any) {
    // @ts-ignore
    super._patch(data);
    this.pending = data?.pending ?? false;
  }

  isModerator(channel?: Channel) {
    if (channel instanceof FakeChannel) channel = channel.real;
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
    if (channel instanceof FakeChannel) channel = channel.real;
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
    return this.permissions.has("CHANGE_NICKNAME")
      ? this.displayName[0] < "0"
      : this.user.username[0] < "0";
  }

  get cancerous() {
    const badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (this.nickname && this.nickname == badName)
      return !this.client.util.isASCII(this.user.username);
    return !this.client.util.isASCII(
      this.permissions.has("CHANGE_NICKNAME")
        ? this.displayName
        : this.user.username
    );
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

  async warn(reason: string, moderator: FireMember, channel?: TextChannel) {
    const embed = new MessageEmbed()
      .setColor("#E67E22")
      .setTimestamp(new Date())
      .setAuthor(
        this.guild.language.get("WARN_LOG_AUTHOR", this.toString()),
        this.user.avatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), `${moderator}`)
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "warn", reason)
      .catch(() => {});
    if (!logEntry) return false;
    let noDM: boolean = false;
    await this.send(
      this.language.get("WARN_DM", Util.escapeMarkdown(this.guild.name), reason)
    ).catch(() => {
      noDM = true;
    });
    if (noDM)
      embed.addField(
        this.guild.language.get("ERROR"),
        this.guild.language.get("WARN_LOG_DM_FAIL")
      );
    await this.guild.modLog(embed).catch(() => {});
    if (channel)
      return noDM
        ? await channel.send(
            this.guild.language.get(
              "WARN_FAIL",
              Util.escapeMarkdown(this.toString())
            )
          )
        : await channel.send(
            this.guild.language.get(
              "WARN_SUCCESS",
              Util.escapeMarkdown(this.toString())
            )
          );
  }

  isSuperuser() {
    return this.settings.get("utils.superuser", false);
  }

  createReminder(when: Date, why: string, link: string) {
    this.user.createReminder(when, why, link);
  }

  deleteReminder(timestamp: number) {
    this.user.deleteReminder(timestamp);
  }
}

Structures.extend("GuildMember", () => FireMember);
