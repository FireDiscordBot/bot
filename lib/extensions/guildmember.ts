import * as sanitizer from "@aero/sanitizer";
import { Fire } from "@fire/lib/Fire";
import {
  Channel,
  Formatters,
  GuildChannel,
  GuildMember,
  ImageURLOptions,
  MessageEmbed,
  Permissions,
  Structures,
  ThreadChannel,
  UserMention,
  Util,
} from "discord.js";
import { BaseFakeChannel } from "../interfaces/misc";
import { GuildTextChannel } from "../util/constants";
import { FakeChannel } from "./appcommandmessage";
import { FireGuild } from "./guild";
import { FireUser } from "./user";

export class FireMember extends GuildMember {
  communicationDisabledTimestamp: number;
  declare guild: FireGuild;
  changingNick?: boolean;
  declare user: FireUser;
  declare client: Fire;

  constructor(client: Fire, data: any, guild: FireGuild) {
    super(client, data, guild);
    this.changingNick = false;
    this.communicationDisabledTimestamp = null;

    if ("communication_disabled_until" in data)
      this.communicationDisabledTimestamp = new Date(
        data.communication_disabled_until
      ).getTime();
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
    return `${this.user.username}#${this.user.discriminator}` as unknown as UserMention;
  }

  toMention() {
    return super.toString();
  }

  _patch(data: any) {
    // @ts-ignore
    super._patch(data);

    if ("communication_disabled_until" in data)
      this.communicationDisabledTimestamp = new Date(
        data.communication_disabled_until
      ).getTime();
  }

  _clone(): FireMember {
    // @ts-ignore
    return super._clone();
  }

  get communicationDisabledUntil() {
    return this.communicationDisabledTimestamp
      ? new Date(this.communicationDisabledTimestamp)
      : null;
  }

  async disableCommunication(options: { until: Date | null; reason?: string }) {
    const { until, reason } = options;
    const patched = await this.client.req
      .guilds(this.guild.id)
      .members(this.id)
      .patch({
        data: { communication_disabled_until: until?.toISOString() ?? null },
        reason,
      });
    const clone = this._clone();
    clone?._patch(patched);
    return clone;
  }

  avatarURL({
    format,
    size,
    dynamic,
    display,
  }: ImageURLOptions & { dynamic?: boolean; display?: boolean } = {}) {
    if (!this.avatar)
      return display
        ? this.user.displayAvatarURL({ format, size, dynamic })
        : this.user.avatarURL({ format, size, dynamic });
    if (dynamic) format = this.avatar.startsWith("a_") ? "gif" : format;
    return this.client.util.makeImageUrl(
      `${this.client.options.http.cdn}/guilds/${this.guild.id}/users/${this.id}/avatars/${this.avatar}`,
      { format, size }
    );
  }

  displayAvatarURL(options: ImageURLOptions & { dynamic?: boolean }) {
    return (
      this.avatarURL({ ...options, display: true }) ||
      this.user.displayAvatarURL(options)
    );
  }

  isModerator(channel?: Channel | BaseFakeChannel) {
    if (this.id == this.client.user?.id) return true;
    if (this.id == this.guild.ownerId) return true;
    if (channel instanceof BaseFakeChannel) channel = channel.real;
    else if (channel instanceof ThreadChannel) channel = channel.parent;
    if (this.isAdmin(channel)) return true;
    const moderators = this.guild.settings.get<string[]>(
      "utils.moderators",
      []
    );
    if (moderators.length) {
      if (moderators.includes(this.id)) return true;
      else if (this.roles.cache.some((role) => moderators.includes(role.id)))
        return true;
      else return false;
    } else return null;
  }

  isAdmin(channel?: Channel | BaseFakeChannel) {
    if (this.id == this.client.user?.id) return true;
    if (this.id == this.guild.ownerId) return true;
    if (channel instanceof BaseFakeChannel) channel = channel.real;
    else if (channel instanceof ThreadChannel) channel = channel.parent;
    return channel
      ? this.permissionsIn(channel as GuildChannel).has(
          Permissions.FLAGS.MANAGE_GUILD
        )
      : this.permissions.has(Permissions.FLAGS.MANAGE_GUILD);
  }

  async blacklist(reason: string) {
    return await this.client.util.blacklist(this, reason);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }

  hasExperiment(id: number, bucket: number | number[]) {
    return this.user.hasExperiment(id, bucket);
  }

  giveExperiment(id: number, bucket: number) {
    return this.user.giveExperiment(id, bucket);
  }

  removeExperiment(id: number, bucket: number) {
    return this.user.removeExperiment(id, bucket);
  }

  get hoisted() {
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (this.nickname && this.nickname == badName)
      return this.user.username[0] < "0";
    return this.permissions.has(Permissions.FLAGS.CHANGE_NICKNAME)
      ? this.displayName[0] < "0"
      : this.user.username[0] < "0";
  }

  get cancerous() {
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (this.nickname && this.nickname == badName)
      return !this.client.util.isASCII(this.user.username);
    return !this.client.util.isASCII(
      this.permissions.has(Permissions.FLAGS.CHANGE_NICKNAME)
        ? this.displayName
        : this.user.username
    );
  }

  async dehoist() {
    if (
      this.isModerator() ||
      this.changingNick ||
      this.roles.highest.rawPosition >=
        this.guild.me.roles.highest.rawPosition ||
      !this.guild.settings.get<boolean>("mod.autodehoist") ||
      !this.guild.me.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES)
    )
      return;
    this.changingNick = true;
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (!this.hoisted && !this.cancerous && this.nickname == badName)
      return this.edit(
        { nick: null },
        this.guild.language.get("AUTODEHOIST_RESET_REASON")
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
      return this.edit(
        { nick: null },
        this.guild.language.get("AUTODEHOIST_USERNAME_REASON")
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
    return await this.edit(
      { nick: badName },
      this.guild.language.get("AUTODEHOIST_REASON")
    )
      .catch(() => false)
      .finally(() => {
        this.changingNick = false;
      });
  }

  async decancer() {
    if (
      this.isModerator() ||
      this.changingNick ||
      this.roles.highest.rawPosition >=
        this.guild.me.roles.highest.rawPosition ||
      !this.guild.settings.get<boolean>("mod.autodecancer") ||
      !this.guild.me.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES)
    )
      return;
    this.changingNick = true;
    let badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (!this.cancerous && !this.hoisted && this.nickname == badName)
      return this.edit(
        { nick: null },
        this.guild.language.get("AUTODECANCER_RESET_REASON")
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
      return this.edit(
        { nick: null },
        this.guild.language.get("AUTODECANCER_USERNAME_REASON")
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
    return await this.edit(
      { nick: badName },
      this.guild.language.get("AUTODECANCER_REASON")
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

  async warn(
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const embed = new MessageEmbed()
      .setColor("#E67E22")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("WARN_LOG_AUTHOR", {
          user: this.toString(),
        }),
        iconURL: this.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "warn", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    let noDM: boolean = false;
    await this.send(
      this.language.get("WARN_DM", {
        guild: Util.escapeMarkdown(this.guild.name),
        reason,
      })
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
    const times = this.client.util.numberWithSuffix(count);
    if (channel)
      return noDM
        ? await channel
            .send({
              content: this.guild.language.getWarning("WARN_FAIL", {
                user: Util.escapeMarkdown(this.toString()),
                times,
              }),
            })
            .catch(() => {})
        : await channel
            .send({
              content: this.guild.language.getSuccess("WARN_SUCCESS", {
                user: Util.escapeMarkdown(this.toString()),
                times,
              }),
            })
            .catch(() => {});
  }

  async note(
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const embed = new MessageEmbed()
      .setColor("#E67E22")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("NOTE_LOG_AUTHOR", { user: this.toString() }),
        this.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "note", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    await this.guild.modLog(embed, "note").catch(() => {});
    const count = await this.client.db
      .query(
        "SELECT COUNT(*) FROM modlogs WHERE gid=$1 AND type=$2 AND uid=$3;",
        [this.guild.id, "note", this.id]
      )
      .first()
      .then((result) => (result.get("count") as number) ?? 0)
      .catch(() => 0);
    const times = this.client.util.numberWithSuffix(count);
    if (channel)
      return await channel
        .send({
          content: this.guild.language.getSuccess("NOTE_SUCCESS", {
            user: Util.escapeMarkdown(this.toString()),
            times,
          }),
        })
        .catch(() => {});
  }

  async bean(
    reason: string,
    moderator: FireMember,
    until?: number,
    days: number = 0,
    channel?: FakeChannel | GuildTextChannel,
    sendDM: boolean = true
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "ban", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    if (this.guild.mutes.has(this.id))
      await this.unmute(
        this.guild.language.get("BAN_MUTED_REASON"),
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
      this.guild.tempBans.set(this.id, until || 0);
      dbadd = await this.client.db
        .query("INSERT INTO bans (gid, uid, until) VALUES ($1, $2, $3);", [
          this.guild.id,
          this.id,
          until?.toString() || "0",
        ])
        .catch(() => {});
    }
    const embed = new MessageEmbed()
      .setColor(this.displayColor || "#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("BAN_LOG_AUTHOR", {
          user: this.toString(),
        }),
        iconURL: this.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    if (until) {
      embed.addField(
        this.guild.language.get("BAN_WILL_BE_UNBANNED"),
        `${Formatters.time(new Date(until), "R")}`
      );
    }
    let noDM: boolean = false;
    if (sendDM) {
      await this.send(
        this.language.get("BAN_DM", {
          guild: Util.escapeMarkdown(this.guild.name),
          reason,
        })
      ).catch(() => {
        noDM = true;
      });
      if (noDM)
        embed.addField(
          this.guild.language.get("ERROR"),
          this.guild.language.get("DM_FAIL")
        );
    }
    await this.guild.modLog(embed, "ban").catch(() => {});
    if (channel)
      return await channel
        .send({
          content:
            (dbadd
              ? this.guild.language.getSuccess("BAN_SUCCESS", {
                  user: Util.escapeMarkdown(this.toString()),
                  guild: Util.escapeMarkdown(this.guild.name),
                })
              : this.guild.language.getWarning("BAN_SEMI_SUCCESS", {
                  user: Util.escapeMarkdown(this.toString()),
                  guild: Util.escapeMarkdown(this.guild.name),
                })) +
            (this.id == "159985870458322944"
              ? "\nhttps://tenor.com/view/star-wars-death-star-explosion-explode-gif-17964336"
              : ""),
        })
        .catch(() => {});
  }

  async yeet(
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel,
    sendDM: boolean = true
  ) {
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
      .setColor(this.displayColor || "#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("KICK_LOG_AUTHOR", {
          user: this.toString(),
        }),
        iconURL: this.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    let noDM: boolean = false;
    if (sendDM) {
      await this.send(
        this.language.get("KICK_DM", {
          guild: Util.escapeMarkdown(this.guild.name),
          reason,
        })
      ).catch(() => {
        noDM = true;
      });
      if (noDM)
        embed.addField(
          this.guild.language.get("ERROR"),
          this.guild.language.get("DM_FAIL")
        );
    }
    await this.guild.modLog(embed, "kick").catch(() => {});
    if (channel)
      return await channel
        .send({
          content: this.guild.language.getSuccess("KICK_SUCCESS", {
            user: Util.escapeMarkdown(this.toString()),
          }),
        })
        .catch(() => {});
  }

  async derank(
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel
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
      .setColor(this.displayColor || "#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("DERANK_LOG_AUTHOR", {
          user: this.toString(),
        }),
        iconURL: this.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
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
        .send({
          content: failed
            ? this.guild.language.getWarning("DERANK_FAILED", {
                user: Util.escapeMarkdown(this.toString()),
                roles: this.guild.roles.cache
                  .filter((role) => afterIds.includes(role.id))
                  .map((role) => Util.escapeMarkdown(role.name))
                  .join(", "),
              })
            : this.guild.language.getSuccess("DERANK_SUCCESS", {
                user: Util.escapeMarkdown(this.toString()),
              }),
        })
        .catch(() => {});
  }

  async mute(
    reason: string,
    moderator: FireMember,
    until?: number,
    channel?: FakeChannel | GuildTextChannel,
    sendDM: boolean = true
  ) {
    const canTimeOut =
      until &&
      until < +new Date() + 2419199999 &&
      this.guild.hasExperiment(1955682940, 1) &&
      this.guild.me?.permissions?.has("MODERATE_MEMBERS");
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    let useEdit = false;
    if (!this.guild.muteRole && !canTimeOut) {
      if (channel) {
        useEdit = true;
        await channel.send(this.language.get("MUTE_ROLE_CREATE_REASON"));
      }
      const role = await this.guild.initMuteRole();
      if (!role) return "role";
    } else if (!canTimeOut) this.guild.syncMuteRolePermissions();
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, "mute", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const muted = canTimeOut
      ? await this.disableCommunication({
          until: new Date(until),
          reason: `${moderator} | ${reason}`,
        }).catch(() => {})
      : await this.roles
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
    let dbadd: unknown;
    // for less than 5 mins, we should be fine without storing it
    if (!canTimeOut || until - +new Date() > 300000) {
      this.guild.mutes.set(this.id, until || 0);
      dbadd = await this.client.db
        .query("INSERT INTO mutes (gid, uid, until) VALUES ($1, $2, $3);", [
          this.guild.id,
          this.id,
          until?.toString() || "0",
        ])
        .catch(() => {});
    } else dbadd = true;
    const embed = new MessageEmbed()
      .setColor(this.displayColor || "#2ECC71")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("MUTE_LOG_AUTHOR", {
          user: this.toString(),
        }),
        iconURL: this.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    if (until) {
      embed.addField(
        this.guild.language.get("MUTE_WILL_BE_UNMUTED"),
        `${Formatters.time(new Date(until), "R")}`
      );
    }
    let noDM: boolean = false;
    if (sendDM) {
      await this.send(
        this.language.get("MUTE_DM", {
          guild: Util.escapeMarkdown(this.guild.name),
          reason,
        })
      ).catch(() => {
        noDM = true;
      });
      if (noDM)
        embed.addField(
          this.guild.language.get("ERROR"),
          this.guild.language.get("DM_FAIL")
        );
    }
    await this.guild.modLog(embed, "mute").catch(() => {});
    if (channel)
      return await channel
        .send({
          content: dbadd
            ? this.guild.language.getSuccess("MUTE_SUCCESS", {
                user: Util.escapeMarkdown(this.toString()),
              })
            : this.guild.language.getWarning("MUTE_SEMI_SUCCESS", {
                user: Util.escapeMarkdown(this.toString()),
              }),
        })
        .catch(() => {});
  }

  async unmute(
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    if (!this.guild.mutes.has(this.id)) {
      if (this.guild.hasExperiment(1955682940, 1)) {
        if (this.communicationDisabledUntil) {
          const unmuted = await this.disableCommunication({
            until: null,
            reason: `${moderator} | ${reason}`,
          }).catch(() => {});
          if (channel && unmuted && !this.communicationDisabledUntil)
            return await channel.send(
              this.guild.language.get("UNMUTE_UNKNOWN_REMOVED")
            );
          else return "unknown";
        } else return "not_muted";
      } else {
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
    }
    if (
      !this.roles.cache.has(this.guild.muteRole?.id) &&
      !this.communicationDisabledUntil
    ) {
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
    const unmuted = this.communicationDisabledUntil
      ? await this.disableCommunication({
          until: null,
          reason: `${moderator} | ${reason}`,
        }).catch(() => {})
      : await this.roles
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
      .setColor(this.displayColor || "#2ECC71")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("UNMUTE_LOG_AUTHOR", {
          user: this.toString(),
        }),
        iconURL: this.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
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
        .send({
          content: this.guild.language.getSuccess("UNMUTE_SUCCESS", {
            user: Util.escapeMarkdown(this.toString()),
          }),
        })
        .catch(() => {});
  }

  isSuperuser() {
    return this.client.util.isSuperuser(this.id);
  }

  createReminder(when: Date, why: string, link: string) {
    this.user.createReminder(when, why, link);
  }

  deleteReminder(timestamp: number) {
    this.user.deleteReminder(timestamp);
  }
}

Structures.extend("GuildMember", () => FireMember);
