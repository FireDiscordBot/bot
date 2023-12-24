import * as sanitizer from "@aero/sanitizer";
import { Fire } from "@fire/lib/Fire";
import {
  DMChannel,
  Formatters,
  GuildBasedChannel,
  GuildChannelResolvable,
  GuildMember,
  ImageURLOptions,
  MessageEmbed,
  Permissions,
  Structures,
  ThreadChannel,
  Util,
} from "discord.js";
import Semaphore from "semaphore-async-await";
import { BaseFakeChannel } from "../interfaces/misc";
import { GuildTextChannel, ModLogTypes } from "../util/constants";
import { FakeChannel } from "./appcommandmessage";
import { FireGuild } from "./guild";
import { FireUser } from "./user";

const sanitizerInvalid = "gibberish";

export class FireMember extends GuildMember {
  dehoistAndDecancerLock: Semaphore;
  declare guild: FireGuild;
  declare user: FireUser;
  declare client: Fire;

  constructor(client: Fire, data: any, guild: FireGuild) {
    super(client, data, guild);
    this.dehoistAndDecancerLock = new Semaphore(1);
  }

  // @ts-ignore
  get displayName() {
    return this.nickname ?? this.user.displayName;
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

  get display() {
    return this.nickname && this.nickname != this.user.toString()
      ? `${this.nickname} (${this.user})`
      : this.user.display;
  }

  toString() {
    return this.user.toString();
  }

  toMention() {
    return super.toString();
  }

  _patch(data: any) {
    // @ts-ignore
    super._patch(data);
  }

  _clone(): FireMember {
    // @ts-ignore
    return super._clone();
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

  permissionsIn(
    channel: GuildChannelResolvable | BaseFakeChannel
  ): Readonly<Permissions> {
    if (channel instanceof BaseFakeChannel)
      channel = channel.real as GuildChannelResolvable;
    return super.permissionsIn(channel);
  }

  isModerator(channel?: DMChannel | GuildBasedChannel | BaseFakeChannel) {
    if (this.id == this.client.user?.id) return true;
    if (this.id == this.guild.ownerId) return true;
    if (channel instanceof BaseFakeChannel) channel = channel.real;
    else if (channel instanceof ThreadChannel) channel = channel.parent;
    if (channel instanceof DMChannel) return false;
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

  isAdmin(channel?: DMChannel | GuildBasedChannel | BaseFakeChannel) {
    if (this.id == this.client.user?.id) return true;
    if (this.id == this.guild.ownerId) return true;
    if (channel instanceof BaseFakeChannel)
      channel = channel.real as GuildBasedChannel;
    else if (channel instanceof ThreadChannel) channel = channel.parent;
    if (channel instanceof DMChannel) return false;
    return channel
      ? this.permissionsIn(channel).has(Permissions.FLAGS.MANAGE_GUILD)
      : this.permissions.has(Permissions.FLAGS.MANAGE_GUILD);
  }

  async blacklist(reason: string) {
    return await this.client.util.blacklist(this, reason);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }

  hasExperiment(id: number, bucket: number | number[]): boolean {
    return this.client.util.userHasExperiment(this.id, id, bucket);
  }

  giveExperiment(id: number, bucket: number) {
    return this.user.giveExperiment(id, bucket);
  }

  removeExperiment(id: number, bucket: number) {
    return this.user.removeExperiment(id, bucket);
  }

  private isHoisted() {
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    const member = this,
      user = this.user;
    return {
      get nickname() {
        if (
          !member.nickname ||
          member.nickname == badName ||
          member.nickname == user.displayName ||
          member.nickname == user.username
        )
          return false;
        if (member.nickname[0] < "0") return true;
      },
      displayName: user.displayName && user.displayName[0] < "0",

      // pomelo'd usernames can technically be hoisted but only with a period/underscore
      // so we'll just consider them not hoisted to make things easier.
      username: user.discriminator == "0" ? false : user.username[0] < "0",
    };
  }

  private isNonASCII() {
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    const member = this,
      user = this.user;
    return {
      get nickname() {
        if (
          !member.nickname ||
          member.nickname == badName ||
          member.nickname == user.displayName ||
          member.nickname == user.username
        )
          return false;
        return !member.client.util.isASCII(member.nickname);
      },
      displayName:
        user.displayName && !member.client.util.isASCII(user.displayName),
      username: !member.client.util.isASCII(user.username),
    };
  }

  private async dehoist() {
    const hoisted = this.isHoisted();
    if (
      (!hoisted.nickname && !hoisted.displayName && !hoisted.username) ||
      !this.guild.settings.get<boolean>("mod.autodehoist") ||
      this.isModerator() ||
      this.roles.highest.rawPosition >=
        this.guild.members.me.roles.highest.rawPosition ||
      !this.guild.members.me.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES)
    )
      return;
    // we'll try to fallback on other names (display name & username) if it is a hoisted nickname
    // first up, let's try the display name which we can fallback to by just removing the nickname
    if (hoisted.nickname && !hoisted.displayName)
      return this.edit(
        { nick: null },
        this.guild.language.get("AUTODEHOIST_NICKTODISPLAY_REASON")
      );
    if (this.nickname && !hoisted.nickname) return;
    // next up is the username, which we'll only use for pomelo'd users as they're guaranteed to be non-hoisted
    // or at least not as badly hoisted, since they can use periods & underscores
    // we also check the nickname to ensure we're not unnecessarily editing it
    if (hoisted.displayName && !hoisted.username && !this.nickname)
      return this.edit(
        { nick: this.user.username },
        this.guild.language.get("AUTODEHOIST_USERNAMEFALLBACK_REASON")
      );
    // if they have a nickname/display name and we're here with a hoisted username,
    // we can ignore it as the nickname/display name is not hoisted so it's fine
    if (this.displayName && hoisted.username) return;
    // If we got past all that, we'll need to use the server's "bad name" setting
    // as we have nothing else to fallback on.
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    return this.edit(
      { nick: badName },
      this.guild.language.get("AUTODEHOIST_BADNAME_REASON")
    );
  }

  private async decancer() {
    const nonASCII = this.isNonASCII();
    if (
      (!nonASCII.nickname && !nonASCII.displayName && !nonASCII.username) ||
      !this.guild.settings.get<boolean>("mod.autodecancer") ||
      this.isModerator() ||
      this.roles.highest.rawPosition >=
        this.guild.members.me.roles.highest.rawPosition ||
      !this.guild.members.me.permissions.has(Permissions.FLAGS.MANAGE_NICKNAMES)
    )
      return;
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (nonASCII.nickname) {
      let sanitized: string = sanitizer(this.nickname);
      if (this.guild.settings.get<boolean>("mod.autodehoist"))
        // we need to make sure our sanitized nickname isn't hoisted
        // and since we're sanitizing, we won't care about removing characters from the start
        while (sanitized[0] < "0") sanitized = sanitized.slice(1);
      if (
        sanitized.length <= 32 &&
        sanitized.length >= 2 &&
        sanitized != sanitizerInvalid
      )
        return this.edit(
          { nick: sanitized },
          this.guild.language.get("AUTODECANCER_NICKNAME_REASON")
        );
      else if (!nonASCII.displayName)
        return this.edit(
          { nick: null }, // display name shows when there's no nickname
          this.guild.language.get("AUTODECANCER_NICKTODISPLAY_REASON")
        );
      else if (!nonASCII.username)
        return this.edit(
          { nick: this.user.username },
          this.guild.language.get("AUTODECANCER_NICKTOUSER_REASON")
        );
      else
        return this.edit(
          { nick: badName },
          this.guild.language.get("AUTODECANCER_BADNAME_REASON")
        );
    } else if (nonASCII.displayName && !this.nickname) {
      let sanitized: string = sanitizer(this.user.displayName);
      if (this.guild.settings.get<boolean>("mod.autodehoist"))
        // we need to make sure our sanitized nickname isn't hoisted
        // and since we're sanitizing, we won't care about removing characters from the start
        while (sanitized[0] < "0") sanitized = sanitized.slice(1);
      if (
        sanitized.length <= 32 &&
        sanitized.length >= 2 &&
        sanitized != sanitizerInvalid
      )
        return this.edit(
          { nick: sanitized },
          this.guild.language.get("AUTODECANCER_DISPLAYNAME_REASON")
        );
      else if (!nonASCII.username)
        return this.edit(
          { nick: this.user.username },
          this.guild.language.get("AUTODECANCER_DISPLAYTOUSER_REASON")
        );
      else
        return this.edit(
          { nick: badName },
          this.guild.language.get("AUTODECANCER_BADNAME_REASON")
        );
    } else if (nonASCII.username && !this.displayName) {
      let sanitized: string = sanitizer(this.user.username);
      if (this.guild.settings.get<boolean>("mod.autodehoist"))
        // we need to make sure our sanitized nickname isn't hoisted
        // and since we're sanitizing, we won't care about removing characters from the start
        while (sanitized[0] < "0") sanitized = sanitized.slice(1);
      if (
        sanitized.length <= 32 &&
        sanitized.length >= 2 &&
        sanitized != sanitizerInvalid
      )
        return this.edit(
          { nick: sanitized },
          this.guild.language.get("AUTODECANCER_USERNAME_REASON")
        );
      else
        return this.edit(
          { nick: badName },
          this.guild.language.get("AUTODECANCER_BADNAME_REASON")
        );
    }
  }

  async dehoistAndDecancer() {
    if (
      this.user.bot ||
      (!this.guild.settings.get<boolean>("mod.autodecancer") &&
        !this.guild.settings.get<boolean>("mod.autodehoist"))
    )
      return;
    // Runs both dehoist and decancer with a lock
    // to ensure it can't be run twice at the same time.
    const couldAcquire = this.dehoistAndDecancerLock.tryAcquire();
    if (!couldAcquire) return; // already running
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    const hoisted = this.isHoisted(),
      nonASCII = this.isNonASCII();
    // first we'll check if any names need to be changed and if not,
    // check if the user has the server's bad name as their nickname
    if (
      !hoisted.nickname &&
      !hoisted.displayName &&
      !hoisted.username &&
      !nonASCII.nickname &&
      !nonASCII.displayName &&
      !nonASCII.username
    ) {
      // specifically check for "John Doe 0" because it used that before redoing this for pomelo
      if (
        (this.nickname == badName ||
          this.nickname == "John Doe 0" ||
          this.nickname == this.user.displayName) &&
        this.roles.highest.rawPosition <
          this.guild.members.me.roles.highest.rawPosition &&
        this.guild.members.me.permissions.has(
          Permissions.FLAGS.MANAGE_NICKNAMES
        )
      )
        await this.edit(
          { nick: null },
          this.guild.language.get("AUTODEHOISTANDDECANCER_RESET_REASON", {
            debug:
              this.nickname == badName
                ? `Nickname is equal to server bad name, ${badName}`
                : this.nickname == "John Doe 0"
                ? "Nickname is equal to default bad name with 0 discriminator (pomelo'd)"
                : this.nickname == this.user.displayName
                ? `Nickname is equal to display name, ${this.user.displayName}`
                : "idk why this happened, it probably shouldn't have, please report this as an issue in discord.gg/firebot",
          })
        ).catch(() => {});
      return this.dehoistAndDecancerLock.release();
    }

    // each of these will check if it's necessary so we don't need to check hoisted/nonASCII again
    await this.decancer().catch(() => {});
    await this.dehoist().catch(() => {});
    this.dehoistAndDecancerLock.release();
  }

  async warn(
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const embed = new MessageEmbed()
      .setColor(this.displayColor || moderator.displayColor || "#FFFFFF")
      .setTimestamp()
      .setAuthor({
        name: this.guild.language.get("WARN_LOG_AUTHOR", {
          user: this.display,
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
      .createModLogEntry(this, moderator, ModLogTypes.WARN, reason)
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
    await this.guild.modLog(embed, ModLogTypes.WARN).catch(() => {});
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
      .setColor(this.displayColor || moderator.displayColor || "#FFFFFF")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("NOTE_LOG_AUTHOR", { user: this.display }),
        this.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.guild.language.get("MODERATOR"), moderator.toString())
      .addField(this.guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    const logEntry = await this.guild
      .createModLogEntry(this, moderator, ModLogTypes.NOTE, reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    await this.guild.modLog(embed, ModLogTypes.NOTE).catch(() => {});
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
      .createModLogEntry(this, moderator, ModLogTypes.BAN, reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    if (this.guild.mutes.has(this.id))
      await this.unmute(
        this.guild.language.get("BAN_MUTED_REASON"),
        this.guild.members.me as FireMember
      ).catch(() => {});
    const banned = await this.ban({
      reason: `${moderator} | ${reason}`,
      deleteMessageSeconds: 86400 * days,
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
          user: this.display,
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
        Formatters.time(new Date(until), "R")
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
    await this.guild.modLog(embed, ModLogTypes.BAN).catch(() => {});
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
      .createModLogEntry(this, moderator, ModLogTypes.KICK, reason)
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
          user: this.display,
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
    await this.guild.modLog(embed, ModLogTypes.KICK).catch(() => {});
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
      .createModLogEntry(this, moderator, ModLogTypes.DERANK, reason)
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
          user: this.display,
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
    await this.guild.modLog(embed, ModLogTypes.DERANK).catch(() => {});
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
      this.guild.members.me?.permissions?.has("MODERATE_MEMBERS");
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
      .createModLogEntry(this, moderator, ModLogTypes.MUTE, reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const muted = canTimeOut
      ? await this.disableCommunicationUntil(
          new Date(until),
          `${moderator} | ${reason}`
        ).catch(() => {})
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
          user: this.display,
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
        Formatters.time(new Date(until), "R")
      );
    }
    let noDM: boolean = false;
    if (sendDM) {
      await this.send(
        this.language.get("MUTE_DM", {
          guild: Util.escapeMarkdown(this.guild.name),
          reason,
        }) +
          (this.id == "249287049482338305"
            ? "\nhttps://static.inv.wtf/muted.mp4"
            : "")
      ).catch(() => {
        noDM = true;
      });
      if (noDM)
        embed.addField(
          this.guild.language.get("ERROR"),
          this.guild.language.get("DM_FAIL")
        );
    }
    await this.guild.modLog(embed, ModLogTypes.MUTE).catch(() => {});
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
      if (+new Date() < +this.communicationDisabledUntil) {
        const unmuted = await this.disableCommunicationUntil(
          null,
          `${moderator} | ${reason}`
        ).catch(() => {});
        if (channel && unmuted && !this.communicationDisabledUntil)
          return await channel.send(
            this.guild.language.get("UNMUTE_UNKNOWN_REMOVED")
          );
        else return "unknown";
      } else if (this.roles.cache.has(this.guild.muteRole?.id)) {
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
      .createModLogEntry(this, moderator, ModLogTypes.UNMUTE, reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const until = this.guild.mutes.get(this.id);
    this.guild.mutes.delete(this.id);
    const unmuted = this.communicationDisabledUntil
      ? await this.disableCommunicationUntil(
          null,
          `${moderator} | ${reason}`
        ).catch(() => {})
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
          user: this.display,
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
    await this.guild.modLog(embed, ModLogTypes.UNMUTE).catch(() => {});
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
