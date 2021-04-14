import {
  MessageEmbed,
  GuildMember,
  Structures,
  Channel,
  Util,
} from "discord.js";
import { FakeChannel } from "./slashCommandMessage";
import { humanize } from "@fire/lib/util/constants";
import { FireTextChannel } from "./textchannel";
import * as sanitizer from "@aero/sanitizer";
import { FireMessage } from "./message";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import * as moment from "moment";

export class FireMember extends GuildMember {
  changingNick?: boolean;
  guild: FireGuild;
  user: FireUser;
  client: Fire;

  constructor(client: Fire, data: any, guild: FireGuild) {
    super(client, data, guild);
    this.changingNick = false;
  }

  get language() {
    return this.user.language;
  }

  get settings() {
    return this.user.settings;
  }

  get premium() {
    return this.user.premium;
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
  }

  isModerator(channel?: Channel) {
    if (this.id == this.client.user?.id) return true;
    if (this.id == this.guild.ownerID) return true;
    if (channel instanceof FakeChannel) channel = channel.real;
    if (this.isAdmin(channel)) return true;
    const moderators = this.guild.settings.get(
      "utils.moderators",
      []
    ) as string[];
    if (moderators.length) {
      if (moderators.includes(this.id)) return true;
      else if (this.roles.cache.some((role) => moderators.includes(role.id)))
        return true;
      else return false;
    } else return null;
  }

  isAdmin(channel?: Channel) {
    if (this.id == this.client.user?.id) return true;
    if (this.id == this.guild.ownerID) return true;
    if (channel instanceof FakeChannel) channel = channel.real;
    return channel
      ? this.permissionsIn(channel).has("MANAGE_GUILD")
      : this.permissions.has("MANAGE_GUILD");
  }

  async blacklist(reason: string) {
    return await this.client.util.blacklist(this, reason);
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
    if (this.isModerator() || this.changingNick) return;
    if (!this.guild.settings.get("mod.autodehoist")) return;
    this.changingNick = true;
    const badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (!this.hoisted && !this.cancerous && this.nickname == badName)
      return this.setNickname(
        null,
        this.guild.language.get("AUTODEHOIST_RESET_REASON") as string
      )
        .catch(() => false)
        .finally(() => {
          this.changingNick = false;
        });
    else if (!this.hoisted) {
      this.changingNick = false;
      return;
    }
    if (this.hoisted && !this.user.hoisted && !this.cancerous) {
      return this.setNickname(
        null,
        this.guild.language.get("AUTODEHOIST_USERNAME_REASON") as string
      )
        .catch(() => false)
        .finally(() => {
          this.changingNick = false;
        });
    }
    if (this.displayName == badName) {
      this.changingNick = false;
      return;
    }
    return await this.setNickname(
      badName,
      this.guild.language.get("AUTODEHOIST_REASON") as string
    )
      .catch(() => false)
      .finally(() => {
        this.changingNick = false;
      });
  }

  async decancer() {
    if (this.isModerator() || this.changingNick) return;
    if (!this.guild.settings.get("mod.autodecancer")) return;
    this.changingNick = true;
    let badName = this.guild.settings.get(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (!this.cancerous && !this.hoisted && this.nickname == badName)
      return await this.setNickname(
        null,
        this.guild.language.get("AUTODECANCER_RESET_REASON") as string
      )
        .catch(() => false)
        .finally(() => {
          this.changingNick = false;
        });
    else if (!this.cancerous) {
      this.changingNick = false;
      return;
    }
    if (this.cancerous && !this.user.cancerous && !this.hoisted) {
      return await this.setNickname(
        null,
        this.guild.language.get("AUTODECANCER_USERNAME_REASON") as string
      )
        .catch(() => false)
        .finally(() => {
          this.changingNick = false;
        });
    }
    if (this.displayName == badName) {
      this.changingNick = false;
      return;
    }
    const sanitized: string = sanitizer(this.displayName);
    if (
      sanitized.length > 2 &&
      sanitized.length < 32 &&
      sanitized != "gibberish"
    )
      badName = sanitized;
    return await this.setNickname(
      badName,
      this.guild.language.get("AUTODECANCER_REASON") as string
    )
      .catch(() => false)
      .finally(() => {
        this.changingNick = false;
      });
  }

  async dehoistAndDecancer() {
    // This will be used when dehoisting/decancering and
    // not awaiting (as the result isn't really needed)
    // preventing them from delaying other functions
    await this.dehoist();
    await this.decancer();
  }

  async warn(reason: string, moderator: FireMember, channel?: FireTextChannel) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const embed = new MessageEmbed()
      .setColor("#E67E22")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("WARN_LOG_AUTHOR", this.toString()),
        this.user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "warn", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
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
    await this.guild.modLog(embed, "warn").catch(() => {});
    const count = await this.client.db
      .query("SELECT * FROM modlogs WHERE gid=$1 AND type=$2 AND uid=$3;", [
        this.guild.id,
        "warn",
        this.id,
      ])
      .then((value) => value.rows.length)
      .catch(() => 0);
    let times: string = count.toString();
    // shit code tm
    if (times.endsWith("1")) times = times + (times == "11" ? "th" : "st");
    else if (times.endsWith("2")) times = times + (times == "12" ? "th" : "nd");
    else if (times.endsWith("3")) times = times + (times == "13" ? "th" : "rd");
    else if (
      ["4", "5", "6", "7", "8", "9", "0"].some((num) =>
        times.toString().endsWith(num)
      )
    )
      times = times.toString() + "th";
    if (channel)
      return noDM
        ? await channel
            .send(
              this.guild.language.get(
                "WARN_FAIL",
                Util.escapeMarkdown(this.toString()),
                times
              )
            )
            .catch(() => {})
        : await channel
            .send(
              this.guild.language.get(
                "WARN_SUCCESS",
                Util.escapeMarkdown(this.toString()),
                times
              )
            )
            .catch(() => {});
  }

  async bean(
    reason: string,
    moderator: FireMember,
    until?: number,
    days: number = 0,
    channel?: FireTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "ban", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    if (this.guild.mutes.has(this.id))
      await this.unmute(
        this.guild.language.get("BAN_MUTED_REASON") as string,
        this.guild.me as FireMember
      ).catch(() => {});
    const banned = await this.ban({
      reason: `${moderator} | ${reason}`,
      days,
    }).catch(() => {});
    if (!banned) {
      const deleted = await this.guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "ban" : "ban_and_entry";
    }
    let dbadd: any = !until;
    if (until) {
      this.guild.bans.set(this.id, until || 0);
      dbadd = await this.client.db
        .query("INSERT INTO bans (gid, uid, until) VALUES ($1, $2, $3);", [
          this.guild.id,
          this.id,
          until?.toString() || "0",
        ])
        .catch(() => {});
    }
    const embed = new MessageEmbed()
      .setColor(this.displayHexColor || "#E74C3C")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("BAN_LOG_AUTHOR", this.toString()),
        this.user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    if (until) {
      const duration = moment(until).diff(moment());
      embed.addField(
        this.guild.language.get("UNTIL"),
        `${new Date(until).toLocaleString(this.guild.language.id)} (${humanize(
          duration,
          this.guild.language.id.split("-")[0]
        )})`
      );
    }
    let noDM: boolean = false;
    await this.send(
      this.language.get("BAN_DM", Util.escapeMarkdown(this.guild.name), reason)
    ).catch(() => {
      noDM = true;
    });
    if (noDM)
      embed.addField(
        this.guild.language.get("ERROR"),
        this.guild.language.get("BAN_DM_FAIL")
      );
    await this.guild.modLog(embed, "ban").catch(() => {});
    if (channel)
      return await channel
        .send(
          dbadd
            ? this.guild.language.get(
                "BAN_SUCCESS",
                Util.escapeMarkdown(this.toString()),
                Util.escapeMarkdown(this.guild.name)
              )
            : this.guild.language.get(
                "BAN_SEMI_SUCCESS",
                Util.escapeMarkdown(this.toString()),
                Util.escapeMarkdown(this.guild.name)
              )
        )
        .catch(() => {});
  }

  async yeet(reason: string, moderator: FireMember, channel?: FireTextChannel) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "kick", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const kicked = await this.kick(`${moderator} | ${reason}`).catch(() => {});
    if (!kicked) {
      const deleted = await this.guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "kick" : "kick_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor(this.displayHexColor || "#E74C3C")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("KICK_LOG_AUTHOR", this.toString()),
        this.user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await this.guild.modLog(embed, "kick").catch(() => {});
    if (channel)
      return await channel
        .send(
          this.guild.language.get(
            "KICK_SUCCESS",
            Util.escapeMarkdown(this.toString())
          )
        )
        .catch(() => {});
  }

  async derank(
    reason: string,
    moderator: FireMember,
    channel?: FireTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "derank", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    let failed = false;
    const beforeIds = this.roles.cache
      .filter((role) => role.id != this.guild.roles.everyone.id)
      .map((role) => role.id);
    await this.roles
      .remove(
        this.roles.cache.filter(
          (role) => role.id != this.guild.roles.everyone.id
        ),
        `${moderator} | ${reason}`
      )
      .catch(() => {});
    const afterIds = this.roles.cache
      .filter((role) => role.id != this.guild.roles.everyone.id)
      .map((role) => role.id);
    if (beforeIds.length == afterIds.length) {
      const deleted = await this.guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "derank" : "derank_and_entry";
    }
    if (afterIds.length >= 1) failed = true;
    const embed = new MessageEmbed()
      .setColor(this.displayHexColor || "#E74C3C")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("DERANK_LOG_AUTHOR", this.toString()),
        this.user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    if (failed)
      embed.addField(
        this.guild.language.get("DERANK_FAILED_TO_REMOVE"),
        this.guild.roles.cache
          .filter((role) => afterIds.includes(role.id))
          .map((role) => role.toString())
          .join(", ")
      );
    await this.guild.modLog(embed, "derank").catch(() => {});
    if (channel)
      return await channel
        .send(
          failed
            ? this.guild.language.get(
                "DERANK_FAILED",
                Util.escapeMarkdown(this.toString()),
                this.guild.roles.cache
                  .filter((role) => afterIds.includes(role.id))
                  .map((role) => Util.escapeMarkdown(role.name))
                  .join(", ")
              )
            : this.guild.language.get(
                "DERANK_SUCCESS",
                Util.escapeMarkdown(this.toString())
              )
        )
        .catch(() => {});
  }

  async mute(
    reason: string,
    moderator: FireMember,
    until?: number,
    channel?: FireTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    if (!this.guild.muteRole) {
      let settingUp: FireMessage;
      if (channel)
        settingUp = (await channel.send(
          this.language.get("MUTE_ROLE_CREATE_REASON")
        )) as FireMessage;
      const role = await this.guild.initMuteRole();
      settingUp?.delete();
      if (!role) return "role";
    } else this.guild.syncMuteRolePermissions();
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "mute", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const muted = await this.roles
      .add(this.guild.muteRole, `${moderator} | ${reason}`)
      .catch(() => {});
    if (!muted) {
      const deleted = await this.guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "mute" : "mute_and_entry";
    }
    if (this.guild.mutes.has(this.id))
      // delete existing mute first
      await this.client.db
        .query("DELETE FROM mutes WHERE gid=$1 AND uid=$2;", [
          this.guild.id,
          this.id,
        ])
        .catch(() => {});
    this.guild.mutes.set(this.id, until || 0);
    const dbadd = await this.client.db
      .query("INSERT INTO mutes (gid, uid, until) VALUES ($1, $2, $3);", [
        this.guild.id,
        this.id,
        until?.toString() || "0",
      ])
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor(this.displayHexColor || "#2ECC71")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("MUTE_LOG_AUTHOR", this.toString()),
        this.user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    if (until) {
      const duration = moment(until).diff(moment());
      embed.addField(
        this.guild.language.get("UNTIL"),
        `${new Date(until).toLocaleString(this.guild.language.id)} (${humanize(
          duration,
          this.guild.language.id.split("-")[0]
        )})`
      );
    }
    await this.guild.modLog(embed, "mute").catch(() => {});
    if (channel)
      return await channel
        .send(
          dbadd
            ? this.guild.language.get(
                "MUTE_SUCCESS",
                Util.escapeMarkdown(this.toString())
              )
            : this.guild.language.get(
                "MUTE_SEMI_SUCCESS",
                Util.escapeMarkdown(this.toString())
              )
        )
        .catch(() => {});
  }

  async unmute(
    reason: string,
    moderator: FireMember,
    channel?: FireTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    if (!this.guild.mutes.has(this.id)) {
      if (this.roles.cache.has(this.guild.muteRole?.id)) {
        const unmuted = await this.roles
          .remove(this.guild.muteRole, `${moderator} | ${reason}`)
          .catch(() => {});
        if (
          channel &&
          unmuted &&
          !this.roles.cache.has(this.guild.muteRole?.id)
        )
          return await channel.send(
            this.guild.language.get("UNMUTE_UNKNOWN_REMOVED")
          );
        else return "unknown";
      } else return "not_muted";
    }
    if (!this.roles.cache.has(this.guild.muteRole?.id)) {
      this.guild.mutes.delete(this.id);
      await this.client.db
        .query("DELETE FROM mutes WHERE gid=$1 AND uid=$2;", [
          this.guild.id,
          this.id,
        ])
        .catch(() => {});
      return "not_muted";
    }
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "unmute", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const until = this.guild.mutes.get(this.id);
    this.guild.mutes.delete(this.id);
    const unmuted = await this.roles
      .remove(this.guild.muteRole, `${moderator} | ${reason}`)
      .catch(() => {});
    if (!unmuted) {
      // ensures user can be properly unmuted
      // if moderator retries unmute
      this.guild.mutes.set(this.id, until);
      const deleted = await this.guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "unmute" : "unmute_and_entry";
    }
    const dbremove = await this.client.db
      .query("DELETE FROM mutes WHERE gid=$1 AND uid=$2;", [
        this.guild.id,
        this.id,
      ])
      .catch(() => {});
    const embed = new MessageEmbed()
      .setColor(this.displayHexColor || "#2ECC71")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("UNMUTE_LOG_AUTHOR", this.toString()),
        this.user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    if (!dbremove)
      embed.addField(
        this.guild.language.get("ERROR"),
        this.guild.language.get("UNMUTE_FAILED_DB_REMOVE")
      );
    await this.guild.modLog(embed, "unmute").catch(() => {});
    if (channel)
      return await channel
        .send(
          this.guild.language.get(
            "UNMUTE_SUCCESS",
            Util.escapeMarkdown(this.toString())
          )
        )
        .catch(() => {});
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
