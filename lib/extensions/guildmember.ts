import { Fire } from "@fire/lib/Fire";
import Appeals from "@fire/src/commands/Moderation/appeals";
import { APIGuildMember, PermissionFlagsBits } from "discord-api-types/v9";
import {
  DMChannel,
  Formatters,
  GuildBasedChannel,
  GuildChannelResolvable,
  GuildMember,
  GuildMemberFlags,
  ImageURLOptions,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
  Structures,
  ThreadChannel,
  Util,
} from "discord.js";
import { MessageButtonStyles } from "discord.js/typings/enums";
import Semaphore from "semaphore-async-await";
import { BaseFakeChannel } from "../interfaces/misc";
import {
  constants,
  GuildTextChannel,
  ModLogTypes,
  ModLogTypeString,
} from "../util/constants";
import { FakeChannel as SlashFakeChannel } from "./appcommandmessage";
import { FakeChannel as ContextFakeChannel } from "./contextcommandmessage";
import { FireGuild } from "./guild";
import { FireUser } from "./user";

export class FireMember extends GuildMember {
  // fields not currently in d.js fork
  unusualDMActivityUntil: Date | null;

  dehoistAndDecancerLock: Semaphore;
  declare guild: FireGuild;
  declare user: FireUser;
  declare client: Fire;

  constructor(client: Fire, data: any, guild: FireGuild) {
    super(client, data, guild);
    this.dehoistAndDecancerLock = new Semaphore(1);

    if ("unusual_dm_activity_until" in data)
      this.unusualDMActivityUntil = data.unusual_dm_activity_until
        ? new Date(data.unusual_dm_activity_until)
        : null;
  }

  // @ts-ignore
  get globalName() {
    return this.nickname ?? this.user.globalName;
  }

  get language() {
    return this.user.language;
  }

  get timezone() {
    return this.user.timezone;
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

  get primaryGuild() {
    return this.user.primaryGuild;
  }

  toString() {
    return this.user.toString();
  }

  toMention() {
    return super.toString();
  }

  toAPIMemberJSON(): APIGuildMember & { permissions: string } {
    const user = this.user;
    return {
      user: {
        id: user.id,
        username: user.username,
        global_name: user.displayName,
        avatar: user.avatar,
        discriminator: user.discriminator,
        bot: user.bot,
        public_flags: user.flags?.bitfield || 0,
      },
      roles: this.roles.cache.map((role) => role.id),
      nick: this.nickname,
      premium_since: this.premiumSince?.toISOString(),
      joined_at: this.joinedAt?.toISOString(),
      pending: this.pending,
      flags: this.flags.bitfield,
      mute: this.voice?.mute || false,
      deaf: this.voice?.deaf || false,
      permissions: this.permissions?.bitfield?.toString(),
    };
  }

  _patch(data: any) {
    if ("unusual_dm_activity_until" in data)
      this.unusualDMActivityUntil = data.unusual_dm_activity_until
        ? new Date(data.unusual_dm_activity_until)
        : null;

    // @ts-ignore
    super._patch(data);
  }

  _clone(): FireMember {
    // @ts-ignore
    return super._clone();
  }

  get unusualDMActivityUntilTimestamp() {
    return this.unusualDMActivityUntil ? +this.unusualDMActivityUntil : null;
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
      ? this.permissionsIn(channel).has(PermissionFlagsBits.ManageGuild)
      : this.permissions.has(PermissionFlagsBits.ManageGuild);
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

  async getModLogStats(excludeAutomated = true) {
    return this.user.getModLogStats(this.guild, excludeAutomated);
  }

  async getModeratorStats(guild: FireGuild, since?: Date) {
    if (!this.isModerator()) return null;
    const logs = await this.client.db
      .query(
        since
          ? "SELECT type, count(caseid) FROM modlogs WHERE modid=$1 AND gid=$2 AND created >= $3 GROUP BY type;"
          : "SELECT type, count(caseid) FROM modlogs WHERE modid=$1 AND gid=$2 GROUP BY type;",
        since ? [this.id, guild.id, since] : [this.id, guild.id]
      )
      .catch(() => {});
    const types: {
      [K in ModLogTypeString]: number;
    } = {
      system: 0,
      warn: 0,
      note: 0,
      ban: 0,
      unban: 0,
      kick: 0,
      block: 0,
      unblock: 0,
      derank: 0,
      mute: 0,
      unmute: 0,
      role_persist: 0,
      blacklist: 0,
      unblacklist: 0,
      unusual_dm_activity: 0,
    };
    if (!logs) return types;
    for await (const entry of logs) {
      const type = entry.get("type") as ModLogTypeString;
      const count = entry.get("count") as bigint;
      types[type] = Number(count); // we don't want bigints nor should we ever need them
    }
    return types;
  }

  async createModLogEntry(
    moderator: FireMember,
    type: ModLogTypes,
    reason: string,
    date?: Date
  ) {
    return this.guild.createModLogEntry(this, moderator, type, reason, date);
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
          member.nickname == user.globalName ||
          member.nickname == user.username
        )
          return false;
        if (member.nickname[0] < "0") return true;
      },
      globalName: user.globalName && user.globalName[0] < "0",

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
        if (!member.nickname || member.nickname == badName) return false;
        return !member.client.util.isASCII(member.nickname);
      },
      globalName:
        user.globalName && !member.client.util.isASCII(user.globalName),
      username: !member.client.util.isASCII(user.username),
    };
  }

  private async dehoist() {
    const hoisted = this.isHoisted();
    if (
      (!hoisted.nickname && !hoisted.globalName && !hoisted.username) ||
      !this.guild.settings.get<boolean>("mod.autodehoist") ||
      this.isModerator() ||
      this.roles.highest.rawPosition >=
        this.guild.members.me.roles.highest.rawPosition ||
      !this.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageNicknames
      )
    )
      return;
    // we'll try to fallback on other names (display name & username) if it is a hoisted nickname
    // first up, let's try the display name which we can fallback to by just removing the nickname
    if (hoisted.nickname && !hoisted.globalName)
      return this.edit(
        { nick: null },
        this.guild.language.get("AUTODEHOIST_NICKTODISPLAY_REASON")
      );
    if (this.nickname && !hoisted.nickname) return;
    // next up is the username, which we'll only use for pomelo'd users as they're guaranteed to be non-hoisted
    // or at least not as badly hoisted, since they can use periods & underscores
    // we also check the nickname to ensure we're not unnecessarily editing it
    if (hoisted.globalName && !hoisted.username && !this.nickname)
      return this.edit(
        { nick: this.user.username },
        this.guild.language.get("AUTODEHOIST_USERNAMEFALLBACK_REASON")
      );
    // if they have a nickname/display name and we're here with a hoisted username,
    // we can ignore it as the nickname/display name is not hoisted so it's fine
    if (this.globalName && hoisted.username) return;
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
      (!nonASCII.nickname && !nonASCII.globalName && !nonASCII.username) ||
      !this.guild.settings.get<boolean>("mod.autodecancer") ||
      this.isModerator() ||
      this.roles.highest.rawPosition >=
        this.guild.members.me.roles.highest.rawPosition ||
      !this.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageNicknames
      )
    )
      return;
    const badName = this.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${this.user.discriminator}`
    );
    if (nonASCII.nickname) {
      let sanitized: string = this.client.util.sanitizer(
        this.nickname,
        badName
      );
      if (this.guild.settings.get<boolean>("mod.autodehoist"))
        // we need to make sure our sanitized nickname isn't hoisted
        // and since we're sanitizing, we won't care about removing characters from the start
        while (sanitized[0] < "0") sanitized = sanitized.slice(1);
      if (sanitized.length <= 32 && sanitized.length >= 2)
        return this.edit(
          { nick: sanitized },
          this.guild.language.get("AUTODECANCER_NICKNAME_REASON")
        );
      else if (!nonASCII.globalName)
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
    } else if (nonASCII.globalName && !this.nickname) {
      let sanitized: string = this.client.util.sanitizer(
        this.user.globalName,
        badName
      );
      if (this.guild.settings.get<boolean>("mod.autodehoist"))
        // we need to make sure our sanitized nickname isn't hoisted
        // and since we're sanitizing, we won't care about removing characters from the start
        while (sanitized[0] < "0") sanitized = sanitized.slice(1);
      if (sanitized.length <= 32 && sanitized.length >= 2)
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
    } else if (nonASCII.username && !this.globalName) {
      let sanitized: string = this.client.util.sanitizer(
        this.user.username,
        badName
      );
      if (this.guild.settings.get<boolean>("mod.autodehoist"))
        // we need to make sure our sanitized nickname isn't hoisted
        // and since we're sanitizing, we won't care about removing characters from the start
        while (sanitized[0] < "0") sanitized = sanitized.slice(1);
      if (sanitized.length <= 32 && sanitized.length >= 2)
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
        !this.guild.settings.get<boolean>("mod.autodehoist")) ||
      // can't edit if quarantined, even if it's for
      // the clan tag which we're not changing
      this.flags.has(GuildMemberFlags.FLAGS.AUTOMOD_QUARANTINED_CLAN_TAG) ||
      this.flags.has(GuildMemberFlags.FLAGS.AUTOMOD_QUARANTINED_NAME)
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
      !hoisted.globalName &&
      !hoisted.username &&
      !nonASCII.nickname &&
      !nonASCII.globalName &&
      !nonASCII.username
    ) {
      // specifically check for "John Doe 0" because it used that before redoing this for pomelo
      if (
        (this.nickname == badName ||
          this.nickname == "John Doe 0" ||
          this.nickname == this.user.globalName) &&
        this.roles.highest.rawPosition <
          this.guild.members.me.roles.highest.rawPosition &&
        this.guild.members.me.permissions.has(
          PermissionFlagsBits.ManageNicknames
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
                  : this.nickname == this.user.globalName
                    ? `Nickname is equal to display name, ${this.user.globalName}`
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
    channel?: SlashFakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return null;
    if (!moderator.isModerator(channel)) return "FORBIDDEN";
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
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.WARN,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
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
      embed.addFields({
        name: this.guild.language.get("ERROR"),
        value: this.guild.language.get("WARN_LOG_DM_FAIL"),
      });
    await this.guild.modLog(embed, ModLogTypes.WARN).catch(() => {});
    const countResult = await this.client.db
      .query(
        "SELECT count(caseid) FROM modlogs WHERE gid=$1 AND type=$2 AND uid=$3;",
        [this.guild.id, "warn", this.id]
      )
      .first()
      .catch(() => ({ get: (_: string) => 0n }));
    const times = this.client.util.numberWithSuffix(
      Number(countResult.get("count") as bigint)
    );
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "warn")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
      return noDM
        ? await channel
            .send({
              content:
                this.guild.language.getWarning("WARN_FAIL", {
                  user: Util.escapeMarkdown(this.toString()),
                  times,
                }) +
                (nonZeroTypes
                  ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                      entries: nonZeroTypes,
                    })}`
                  : ""),
            })
            .catch(() => {})
        : await channel
            .send({
              content:
                this.guild.language.getSuccess("WARN_SUCCESS", {
                  user: Util.escapeMarkdown(this.toString()),
                  times,
                }) +
                (nonZeroTypes
                  ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                      entries: nonZeroTypes,
                    })}`
                  : ""),
            })
            .catch(() => {});
    }
  }

  async note(
    reason: string,
    moderator: FireMember,
    channel?: SlashFakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return null;
    if (!moderator.isModerator(channel)) return "FORBIDDEN";
    const embed = new MessageEmbed()
      .setColor(this.displayColor || moderator.displayColor || "#FFFFFF")
      .setTimestamp()
      .setAuthor(
        this.guild.language.get("NOTE_LOG_AUTHOR", { user: this.display }),
        this.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.NOTE,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
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
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "note")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
      return await channel
        .send({
          content:
            this.guild.language.getSuccess("NOTE_SUCCESS", {
              user: Util.escapeMarkdown(this.toString()),
              times,
            }) +
            (nonZeroTypes
              ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                  entries: nonZeroTypes,
                })}`
              : ""),
        })
        .catch(() => {});
    }
  }

  async bean(
    reason: string,
    moderator: FireMember,
    until?: number,
    deleteMessageSeconds: number = 0,
    channel?: SlashFakeChannel | ContextFakeChannel | GuildTextChannel,
    sendDM: boolean = true
  ) {
    if (!reason || !moderator) return null;
    else if (!moderator.isModerator(channel)) return "FORBIDDEN";
    else if (this.guild.ownerId == this.id) return "OWNER";
    else if (this.id == moderator.id) return "SELF";
    else if (
      this.roles.highest.position >=
        this.guild.members.me.roles.highest.position ||
      this.roles.highest.position >= moderator.roles.highest.position
    )
      return "HIGHER";

    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.BAN,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
    if (this.guild.mutes.has(this.id))
      await this.unmute(
        this.guild.language.get("BAN_MUTED_REASON"),
        this.guild.members.me as FireMember
      ).catch(() => {});
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
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    if (until) {
      embed.addFields({
        name: this.guild.language.get("BAN_WILL_BE_UNBANNED"),
        value: Formatters.time(new Date(until), "R"),
      });
    }
    let noDM: boolean = false,
      banDM: Awaited<ReturnType<FireMember["send"]>> | void;
    if (sendDM) {
      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = appeals
        ? await appeals.getAppealsConfig(this.guild)
        : null;

      let components = [];
      if (
        this.guild.channels.cache.has(config?.channel) &&
        config?.items.length
      ) {
        const appealButton = new MessageButton()
          .setStyle(MessageButtonStyles.LINK)
          .setURL(
            `${constants.url.website}/appeals/submit/${this.guild.id}/${logEntry[1]}`
          )
          .setLabel(this.language.get("APPEALS_BUTTON_LABEL"));
        components = [new MessageActionRow().addComponents(appealButton)];
      }

      banDM = await this.send({
        content: this.language.get("BAN_DM", {
          guild: Util.escapeMarkdown(this.guild.name),
          reason,
        }),
        components,
      }).catch(() => {
        noDM = true;
      });
      if (noDM)
        embed.addFields({
          name: this.guild.language.get("ERROR"),
          value: this.guild.language.get("DM_FAIL"),
        });
    }
    const banned = await this.ban({
      reason: `${moderator} | ${reason}`,
      deleteMessageSeconds,
    }).catch(() => {});
    if (!banned) {
      if (banDM) await banDM.delete().catch(() => {});
      const deleted = await this.guild
        .deleteModLogEntry(logEntry[0])
        .catch(() => false);
      return deleted ? "BAN" : "BAN_AND_ENTRY";
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
    await this.guild.modLog(embed, ModLogTypes.BAN).catch(() => {});
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "ban")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
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
            (nonZeroTypes
              ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                  entries: nonZeroTypes,
                })}`
              : "") +
            (this.id == "159985870458322944"
              ? "\nhttps://tenor.com/view/star-wars-death-star-explosion-explode-gif-17964336"
              : ""),
        })
        .catch(() => {});
    }
  }

  async yeet(
    reason: string,
    moderator: FireMember,
    channel?: SlashFakeChannel | GuildTextChannel,
    sendDM: boolean = true
  ) {
    if (!reason || !moderator) return null;
    if (!moderator.isModerator(channel)) return "FORBIDDEN";
    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.KICK,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
    const kicked = await this.kick(`${moderator} | ${reason}`).catch(() => {});
    if (!kicked) {
      const deleted = await this.guild
        .deleteModLogEntry(logEntry[0])
        .catch(() => false);
      return deleted ? "KICK" : "KICK_AND_ENTRY";
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
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
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
        embed.addFields({
          name: this.guild.language.get("ERROR"),
          value: this.guild.language.get("DM_FAIL"),
        });
    }
    await this.guild.modLog(embed, ModLogTypes.KICK).catch(() => {});
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "kick")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
      return await channel
        .send({
          content:
            this.guild.language.getSuccess("KICK_SUCCESS", {
              user: Util.escapeMarkdown(this.toString()),
            }) +
            (nonZeroTypes
              ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                  entries: nonZeroTypes,
                })}`
              : ""),
        })
        .catch(() => {});
    }
  }

  async derank(
    reason: string,
    moderator: FireMember,
    channel?: SlashFakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return null;
    if (!moderator.isModerator(channel)) return "FORBIDDEN";
    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.DERANK,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
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
        .deleteModLogEntry(logEntry[0])
        .catch(() => false);
      return deleted ? "DERANK" : "DERANK_AND_ENTRY";
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
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    if (failed)
      embed.addFields({
        name: this.guild.language.get("DERANK_FAILED_TO_REMOVE"),
        value: this.guild.roles.cache
          .filter((role) => afterIds.includes(role.id))
          .map((role) => role.toString())
          .join(", "),
      });
    await this.guild.modLog(embed, ModLogTypes.DERANK).catch(() => {});
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "derank")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
      return await channel
        .send({
          content:
            (failed
              ? this.guild.language.getWarning("DERANK_FAILED", {
                  user: Util.escapeMarkdown(this.toString()),
                  roles: this.guild.roles.cache
                    .filter((role) => afterIds.includes(role.id))
                    .map((role) => Util.escapeMarkdown(role.name))
                    .join(", "),
                })
              : this.guild.language.getSuccess("DERANK_SUCCESS", {
                  user: Util.escapeMarkdown(this.toString()),
                })) +
            (nonZeroTypes
              ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                  entries: nonZeroTypes,
                })}`
              : ""),
        })
        .catch(() => {});
    }
  }

  async mute(
    reason: string,
    moderator: FireMember,
    until?: number,
    channel?: SlashFakeChannel | GuildTextChannel,
    sendDM: boolean = true
  ) {
    const canTimeOut =
      until &&
      until < +new Date() + 2419199999 &&
      this.guild.members.me?.permissions?.has(
        PermissionFlagsBits.ModerateMembers
      );
    if (!reason || !moderator) return null;
    if (!moderator.isModerator(channel)) return "FORBIDDEN";
    let useEdit = false;
    if (!this.guild.muteRole && !canTimeOut) {
      if (channel) {
        useEdit = true;
        await channel.send(this.language.get("MUTE_ROLE_CREATE_REASON"));
      }
      const role = await this.guild.initMuteRole();
      if (!role) return "ROLE";
    } else if (!canTimeOut) this.guild.syncMuteRolePermissions();
    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.MUTE,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
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
        .deleteModLogEntry(logEntry[0])
        .catch(() => false);
      return deleted ? "MUTE" : "MUTE_AND_ENTRY";
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
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    if (until) {
      embed.addFields({
        name: this.guild.language.get("MUTE_WILL_BE_UNMUTED"),
        value: Formatters.time(new Date(until), "R"),
      });
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
        embed.addFields({
          name: this.guild.language.get("ERROR"),
          value: this.guild.language.get("DM_FAIL"),
        });
    }
    await this.guild.modLog(embed, ModLogTypes.MUTE).catch(() => {});
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "mute")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
      return await channel
        .send({
          content:
            (dbadd
              ? this.guild.language.getSuccess("MUTE_SUCCESS", {
                  user: Util.escapeMarkdown(this.toString()),
                })
              : this.guild.language.getWarning("MUTE_SEMI_SUCCESS", {
                  user: Util.escapeMarkdown(this.toString()),
                })) +
            (nonZeroTypes
              ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                  entries: nonZeroTypes,
                })}`
              : ""),
        })
        .catch(() => {});
    }
  }

  async unmute(
    reason: string,
    moderator: FireMember,
    channel?: SlashFakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return null;
    if (!moderator.isModerator(channel)) return "FORBIDDEN";
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
        else return "UNKNOWN";
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
        else return "UNKNOWN";
      } else return "NOT_MUTED";
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
      return "NOT_MUTED";
    }
    const logEntry = await this.createModLogEntry(
      moderator,
      ModLogTypes.UNMUTE,
      reason
    ).catch(() => {});
    if (!logEntry) return "ENTRY";
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
        .deleteModLogEntry(logEntry[0])
        .catch(() => false);
      return deleted ? "UNMUTE" : "UNMUTE_AND_ENTRY";
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
      .addFields([
        {
          name: this.guild.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.guild.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    if (!dbremove)
      embed.addFields({
        name: this.guild.language.get("ERROR"),
        value: this.guild.language.get("UNMUTE_FAILED_DB_REMOVE"),
      });
    await this.guild.modLog(embed, ModLogTypes.UNMUTE).catch(() => {});
    if (channel) {
      const stats = await this.getModLogStats();
      const nonZeroTypes = Object.entries(stats)
        .filter(([type, count]) => count > 0 && type != "unmute")
        .map(([type, count]: [ModLogTypeString, number]) =>
          this.guild.language.get("MODLOGS_ACTION_LINE", {
            action: type,
            count,
          })
        )
        .join("\n");
      return await channel
        .send({
          content:
            this.guild.language.getSuccess("UNMUTE_SUCCESS", {
              user: Util.escapeMarkdown(this.toString()),
            }) +
            (nonZeroTypes
              ? `\n\n${this.guild.language.get("MODLOGS_ACTION_FOOTER", {
                  entries: nonZeroTypes,
                })}`
              : ""),
        })
        .catch(() => {});
    }
  }

  isSuperuser() {
    return this.client.util.isSuperuser(this.id);
  }

  createReminder(when: Date, reference: number, why: string, link: string) {
    this.user.createReminder(when, reference, why, link);
  }

  deleteReminder(timestamp: number) {
    this.user.deleteReminder(timestamp);
  }
}

Structures.extend("GuildMember", () => FireMember);
