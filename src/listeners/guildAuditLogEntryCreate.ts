import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import {
  ActionLogTypes,
  constants,
  ModLogTypes,
  titleCase,
} from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { GuildLogManager } from "@fire/lib/util/logmanager";
import * as dayjs from "dayjs";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  Collection,
  Formatters,
  ForumChannel,
  GuildAuditLogsEntry,
  MessageEmbed,
  NewsChannel,
  PermissionOverwriteManager,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { RawPermissionOverwriteData } from "discord.js/typings/rawDataTypes";
import GuildMemberUpdate from "./guildMemberUpdate";

const ReverseChannelTypes = {
  0: "GUILD_TEXT",
  1: "DM",
  2: "GUILD_VOICE",
  3: "GROUP_DM",
  4: "GUILD_CATEGORY",
  5: "GUILD_NEWS",
  6: "GUILD_STORE",
  7: "UNKNOWN",
  10: "GUILD_NEWS_THREAD",
  11: "GUILD_PUBLIC_THREAD",
  12: "GUILD_PRIVATE_THREAD",
  13: "GUILD_STAGE_VOICE",
  14: "GUILD_DIRECTORY",
  15: "GUILD_FORUM",
};

const REPLACE_UNDERSCORE_REGEX = /_/g;

export default class GuildAuditLogEntryCreate extends Listener {
  guildMemberUpdate: GuildMemberUpdate;

  constructor() {
    super("guildAuditLogEntryCreate", {
      emitter: "client",
      event: "guildAuditLogEntryCreate",
    });
  }

  async exec(auditLogEntry: GuildAuditLogsEntry, guild: FireGuild) {
    if (this[auditLogEntry.action])
      this[auditLogEntry.action](auditLogEntry, guild);
  }

  async ["MEMBER_UPDATE"](
    auditLogEntry: GuildAuditLogsEntry<"MEMBER_UPDATE">,
    guild: FireGuild
  ) {
    if (!this.guildMemberUpdate)
      this.guildMemberUpdate = this.client.getListener(
        "guildMemberUpdate"
      ) as GuildMemberUpdate;
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isMembersEnabled()) return;

    // TODO: maybe move this outside here so we're not always redeclaring it
    const ignoredReasons = [
      guild.language.get("AUTODECANCER_NICKNAME_REASON"),
      guild.language.get("AUTODECANCER_DISPLAYNAME_REASON"),
      guild.language.get("AUTODECANCER_USERNAME_REASON"),
      guild.language.get("AUTODECANCER_NICKTODISPLAY_REASON"),
      guild.language.get("AUTODECANCER_NICKTOUSER_REASON"),
      guild.language.get("AUTODECANCER_BADNAME_REASON"),
      guild.language.get("AUTODEHOIST_NICKTODISPLAY_REASON"),
      guild.language.get("AUTODEHOIST_USERNAMEFALLBACK_REASON"),
      guild.language.get("AUTODEHOIST_BADNAME_REASON"),
      guild.language.get("AUTODEHOISTANDDECANCER_RESET_REASON"),
    ];
    if (auditLogEntry.reason && ignoredReasons.includes(auditLogEntry.reason))
      return;

    const targetAndExecutor = (await guild.members.fetch({
      user: [auditLogEntry.targetId, auditLogEntry.executorId],
    })) as Collection<string, FireMember>;
    const target = targetAndExecutor.get(auditLogEntry.targetId);
    const executor = targetAndExecutor.get(auditLogEntry.executorId);

    for (const change of auditLogEntry.changes) {
      if (change.key == "nick")
        this.guildMemberUpdate.logNickChange(auditLogEntry, change, guild, {
          target,
          executor,
        });
      else if (change.key == "communication_disabled_until" && change.new)
        this.guildMemberUpdate.logTimeout(auditLogEntry, change, guild, {
          target,
          executor,
        });
    }
  }

  async ["MEMBER_ROLE_UPDATE"](
    auditLogEntry: GuildAuditLogsEntry<"MEMBER_ROLE_UPDATE">,
    guild: FireGuild
  ) {
    if (!this.guildMemberUpdate)
      this.guildMemberUpdate = this.client.getListener(
        "guildMemberUpdate"
      ) as GuildMemberUpdate;
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isMembersEnabled()) return;

    // TODO: maybe move this outside here so we're not always redeclaring it
    const ignoredReasons = [
      guild.language.get("AUTOROLE_REASON"),
      guild.language.get("REACTIONROLE_ROLE_REASON"),
      guild.language.get("REACTIONROLE_ROLE_REMOVE_REASON"),
      guild.language.get("VCROLE_ADD_REASON"),
      guild.language.get("VCROLE_REMOVE_REASON"),
      guild.language.get("RANKS_JOIN_REASON"),
      guild.language.get("RANKS_LEAVE_REASON"),
    ];
    if (auditLogEntry.reason && ignoredReasons.includes(auditLogEntry.reason))
      return;

    const targetAndExecutor = (await guild.members.fetch({
      user: [auditLogEntry.targetId, auditLogEntry.executorId],
    })) as Collection<string, FireMember>;
    const target = targetAndExecutor.get(auditLogEntry.targetId);
    const executor = targetAndExecutor.get(auditLogEntry.executorId);

    for (const change of auditLogEntry.changes)
      if (change.key == "$add")
        await this.guildMemberUpdate
          .logRoleAdd(auditLogEntry, change, guild, { target, executor })
          .catch(() => {});
      else if (change.key == "$remove")
        await this.guildMemberUpdate
          .logRoleRemove(auditLogEntry, change, guild, { target, executor })
          .catch(() => {});
  }

  async ["MEMBER_BAN_ADD"](
    auditLogEntry: GuildAuditLogsEntry<"MEMBER_BAN_ADD">,
    guild: FireGuild
  ) {
    if (auditLogEntry.executorId == this.client.user.id) return;
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isModerationEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    if (executor.user.bot) return; // I may add support for specific bots in the future

    const target = (await this.client.users.fetch(
      auditLogEntry.targetId
    )) as FireUser;

    const logEntry = await guild
      .createModLogEntry(
        target,
        executor,
        ModLogTypes.BAN,
        auditLogEntry.reason ??
          guild.language.get("MODERATOR_ACTION_DEFAULT_REASON")
      )
      .catch(() => {});
    if (!logEntry) return;
    const embed = new MessageEmbed()
      .setColor(executor.displayColor || "#FFFFFF")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("BAN_LOG_AUTHOR", { user: target.display }),
        iconURL: target.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addFields([
        {
          name: guild.language.get("MODERATOR"),
          value: executor.toString(),
        },
        {
          name: guild.language.get("REASON"),
          value:
            auditLogEntry.reason ??
            guild.language.get("MODERATOR_ACTION_DEFAULT_REASON"),
        },
      ])
      .setFooter({ text: `${target.id} | ${executor.id}` });
    await guild.modLog(embed, ModLogTypes.BAN).catch(() => {});
  }

  async ["MEMBER_BAN_REMOVE"](
    auditLogEntry: GuildAuditLogsEntry<"MEMBER_BAN_REMOVE">,
    guild: FireGuild
  ) {
    if (auditLogEntry.executorId == this.client.user.id) return;
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isModerationEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    if (executor.user.bot) return; // I may add support for specific bots in the future

    const target = (await this.client.users.fetch(
      auditLogEntry.targetId
    )) as FireUser;

    const logEntry = await guild
      .createModLogEntry(
        target,
        executor,
        ModLogTypes.UNBAN,
        auditLogEntry.reason ??
          guild.language.get("MODERATOR_ACTION_DEFAULT_REASON")
      )
      .catch(() => {});
    if (!logEntry) return;
    const embed = new MessageEmbed()
      .setColor(executor.displayColor || "#FFFFFF")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("UNBAN_LOG_AUTHOR", { user: target.display }),
        iconURL: target.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addFields([
        {
          name: guild.language.get("MODERATOR"),
          value: executor.toString(),
        },
        {
          name: guild.language.get("REASON"),
          value:
            auditLogEntry.reason ??
            guild.language.get("MODERATOR_ACTION_DEFAULT_REASON"),
        },
      ])
      .setFooter({ text: `${target.id} | ${executor.id}` });
    await guild.modLog(embed, ModLogTypes.UNBAN).catch(() => {});
  }

  async ["MEMBER_KICK"](
    auditLogEntry: GuildAuditLogsEntry<"MEMBER_KICK">,
    guild: FireGuild
  ) {
    if (auditLogEntry.executorId == this.client.user.id) return;
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isModerationEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    if (executor.user.bot) return; // I may add support for specific bots in the future

    const target = (await this.client.users.fetch(
      auditLogEntry.targetId
    )) as FireUser;

    const logEntry = await guild
      .createModLogEntry(
        target,
        executor,
        ModLogTypes.KICK,
        auditLogEntry.reason ??
          guild.language.get("MODERATOR_ACTION_DEFAULT_REASON")
      )
      .catch(() => {});
    if (!logEntry) return;
    const embed = new MessageEmbed()
      .setColor(executor.displayColor || "#E74C3C")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("KICK_LOG_AUTHOR", { user: target.display }),
        iconURL: target.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addFields([
        {
          name: guild.language.get("MODERATOR"),
          value: executor.toString(),
        },
        {
          name: guild.language.get("REASON"),
          value:
            auditLogEntry.reason ??
            guild.language.get("MODERATOR_ACTION_DEFAULT_REASON"),
        },
      ])
      .setFooter({ text: `${target.id} | ${executor.id}` });
    await guild.modLog(embed, ModLogTypes.KICK).catch(() => {});
  }

  async ["CHANNEL_CREATE"](
    auditLogEntry: GuildAuditLogsEntry<"CHANNEL_CREATE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    const target =
      guild.channels.cache.get(auditLogEntry.targetId) ??
      // we should never need this, but just in case...
      (await guild.channels.fetch(auditLogEntry.targetId));

    const embed = new MessageEmbed()
      .setColor("#2ECC71")
      .setTimestamp(target.createdAt)
      .setAuthor({
        name: guild.language.get("CHANNELCREATELOG_AUTHOR", {
          type: titleCase(target.type.replace(REPLACE_UNDERSCORE_REGEX, " ")),
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields({ name: guild.language.get("NAME"), value: target.name });
    if (target instanceof FireTextChannel && target.topic)
      embed.addFields({
        name: guild.language.get("TOPIC"),
        value: target.topic,
      });

    if (target instanceof FireTextChannel && target.rateLimitPerUser)
      // this doesn't work too well for very short values (as it says "a few seconds" rather than the actual value)
      // but it's good enough
      embed.addFields({
        name: guild.language.get("SLOWMODE"),
        value: dayjs(+new Date() + target.rateLimitPerUser * 1000).fromNow(
          true
        ),
      });

    // target will never be a thread but this check makes typings easier
    if (!target.isThread() && target.permissionOverwrites.cache.size > 1) {
      const canView = target.permissionOverwrites.cache
        .filter((overwrite) =>
          overwrite.allow.has(PermissionFlagsBits.ViewChannel)
        )
        .map((overwrite) => overwrite.id);
      const roles = [
        ...canView
          .map((id) => guild.roles.cache.get(id))
          .filter((role) => !!role),
        ...guild.roles.cache
          .filter(
            (role) =>
              role.permissions.has(PermissionFlagsBits.Administrator) &&
              !canView.find((id) => id == role.id)
          )
          .values(),
      ];
      const memberIds = canView.filter(
        (id) => !roles.find((role) => role.id == id)
      );
      if (!memberIds.includes(guild.ownerId))
        // owner can always see
        memberIds.push(guild.ownerId);
      const members: string[] = memberIds.length
        ? await guild.members
            .fetch({ user: memberIds })
            .then((found) => found.map((member) => member.toString()))
            .catch(() => [])
        : [];
      const viewers = [...roles.map((role) => role.toString()), ...members];
      if (viewers.length)
        embed.addFields({
          name: guild.language.get("VIEWABLE_BY"),
          value: this.client.util.shorten(viewers, 1024, " - "),
        });
    }
    embed.addFields({
      name: guild.language.get("CREATED_BY"),
      value: `${executor} (${executor.id})`,
    });
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_CREATE).catch(() => {});
  }

  async ["THREAD_CREATE"](
    auditLogEntry: GuildAuditLogsEntry<"THREAD_CREATE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    const parent = guild.channels.cache.find(
      (c) => "threads" in c && c.threads.cache.has(auditLogEntry.targetId)
    ) as NewsChannel | TextChannel | ForumChannel;
    const thread =
      parent.threads.cache.get(auditLogEntry.targetId) ??
      // we should never need this, but just in case...
      ((await guild.channels.fetch(auditLogEntry.targetId)) as ThreadChannel);

    const autoArchiveDuration =
      typeof thread.autoArchiveDuration == "string"
        ? 10080
        : thread.autoArchiveDuration;
    const autoArchiveAt = new Date(+new Date() + autoArchiveDuration * 60000);
    const embed = new MessageEmbed()
      .setColor("#2ECC71")
      .setTimestamp(thread.createdAt)
      .setAuthor({
        name: guild.language.get("CHANNELCREATELOG_AUTHOR", {
          type: titleCase(thread.type.replace(REPLACE_UNDERSCORE_REGEX, " ")),
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields([
        { name: guild.language.get("NAME"), value: thread.name },
        { name: guild.language.get("CHANNEL"), value: parent.toString() },
        {
          name: guild.language.get("ARCHIVE"),
          value: Formatters.time(autoArchiveAt, "R"),
        },
        {
          name: guild.language.get("CREATED_BY"),
          value: executor ? `${executor} (${executor.id})` : thread.ownerId,
        },
      ])
      .setFooter({ text: auditLogEntry.targetId });
    if (parent.isText() && parent.messages.cache.has(thread.id))
      embed.addFields({
        name: guild.language.get("THREAD_MESSAGE"),
        value: `[${guild.language.get("CLICK_TO_VIEW")}](${
          parent.messages.cache.get(thread.id).url
        })`,
      });
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_CREATE).catch(() => {});
  }

  async ["CHANNEL_DELETE"](
    auditLogEntry: GuildAuditLogsEntry<"CHANNEL_DELETE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    const target = guild.channels.cache.get(auditLogEntry.targetId) ?? {
      // if we're here, the channel was already evicted from the cache
      // so we need to construct an object with the data we need
      name: auditLogEntry.target.name as string,
      type: ReverseChannelTypes[
        auditLogEntry.target.type as number
      ] as keyof typeof ChannelTypes,
      topic:
        "topic" in auditLogEntry.target
          ? (auditLogEntry.target.topic as string)
          : undefined,
      permissionOverwrites: new PermissionOverwriteManager(
        // @ts-ignore / the types are wrong for PermissionOverwriteManager's constructor
        { client: this.client },
        "permission_overwrites" in auditLogEntry.target
          ? (auditLogEntry.target
              .permission_overwrites as RawPermissionOverwriteData[])
          : ([] as RawPermissionOverwriteData[])
      ),
      // nsfw:
      //   "nsfw" in auditLogEntry.target
      //     ? (auditLogEntry.target.nsfw as boolean)
      //     : false,
      rateLimitPerUser:
        "rate_limit_per_user" in auditLogEntry.target
          ? (auditLogEntry.target.rate_limit_per_user as number)
          : undefined,
    };

    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: guild.language.get("CHANNELDELETELOG_AUTHOR", {
          type: titleCase(target.type.replace(REPLACE_UNDERSCORE_REGEX, " ")),
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields({ name: guild.language.get("NAME"), value: target.name })
      .setFooter({ text: auditLogEntry.targetId });
    if ("topic" in target && target.topic)
      embed.addFields({
        name: guild.language.get("TOPIC"),
        value: target.topic,
      });
    if ("rateLimitPerUser" in target && target.rateLimitPerUser)
      // this doesn't work too well for very short values (as it says "a few seconds" rather than the actual value)
      // but it's good enough
      embed.addFields({
        name: guild.language.get("SLOWMODE"),
        value: dayjs(+new Date() + target.rateLimitPerUser * 1000).fromNow(
          true
        ),
      });
    if (
      "permissionOverwrites" in target &&
      target.permissionOverwrites.cache.size > 1
    ) {
      const canView = target.permissionOverwrites.cache
        .filter((overwrite) =>
          overwrite.allow.has(PermissionFlagsBits.ViewChannel)
        )
        .map((overwrite) => overwrite.id);
      const roles = [
        ...canView
          .map((id) => guild.roles.cache.get(id))
          .filter((role) => !!role),
        ...guild.roles.cache
          .filter(
            (role) =>
              role.permissions.has(PermissionFlagsBits.Administrator) &&
              !canView.find((id) => id == role.id)
          )
          .values(),
      ];
      const memberIds = canView.filter(
        (id) => !roles.find((role) => role.id == id)
      );
      if (!memberIds.includes(guild.ownerId))
        // owner can always see
        memberIds.push(guild.ownerId);
      const members: string[] = memberIds.length
        ? await guild.members
            .fetch({ user: memberIds })
            .then((found) => found.map((member) => member.toString()))
            .catch(() => [])
        : [];
      const viewers = [...roles.map((role) => role.toString()), ...members];
      if (viewers.length)
        embed.addFields({
          name: guild.language.get("VIEWABLE_BY"),
          value: this.client.util.shorten(viewers, 1024, " - "),
        });
    }
    embed.addFields({
      name: guild.language.get("DELETED_BY"),
      value: `${executor} (${executor.id})`,
    });
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    // if (raw) embed.addField(language.get("RAW"), raw);
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_DELETE).catch(() => {});
  }

  async ["THREAD_DELETE"](
    auditLogEntry: GuildAuditLogsEntry<"THREAD_DELETE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    const target = (guild.channels.cache.get(
      auditLogEntry.targetId
    ) as ThreadChannel) ?? {
      // if we're here, the channel was already evicted from the cache
      // so we need to construct an object with the data we need
      name: auditLogEntry.target.name as string,
      type: ReverseChannelTypes[
        auditLogEntry.target.type as number
      ] as keyof typeof ChannelTypes,
      archived:
        "archived" in auditLogEntry.target
          ? (auditLogEntry.target.archived as boolean)
          : undefined,
      locked:
        "locked" in auditLogEntry.target
          ? (auditLogEntry.target.locked as boolean)
          : undefined,
      autoArchiveDuration:
        "auto_archive_duration" in auditLogEntry.target
          ? (auditLogEntry.target.auto_archive_duration as number)
          : undefined,
      rateLimitPerUser:
        "rate_limit_per_user" in auditLogEntry.target
          ? (auditLogEntry.target.rate_limit_per_user as number)
          : undefined,
      // appliedTags:
      //   "applied_tags" in auditLogEntry.target
      //     ? (auditLogEntry.target.applied_tags as string[])
      //     : undefined,
    };

    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: guild.language.get("CHANNELDELETELOG_AUTHOR", {
          type: titleCase(target.type.replace(REPLACE_UNDERSCORE_REGEX, " ")),
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields({ name: guild.language.get("NAME"), value: target.name })
      .setFooter({ text: auditLogEntry.targetId });
    if (typeof target.archived == "boolean")
      embed.addFields({
        name: guild.language.get("ARCHIVED"),
        value: target.archived
          ? constants.emojis.success
          : constants.emojis.error,
      });
    if (typeof target.locked == "boolean")
      embed.addFields({
        name: guild.language.get("LOCKED"),
        value: target.locked
          ? constants.emojis.success
          : constants.emojis.error,
      });
    if (target.autoArchiveDuration)
      embed.addFields({
        name: guild.language.get("AUTO_ARCHIVE_DURATION"),
        value: dayjs(+new Date() + target.autoArchiveDuration * 60_000).fromNow(
          true
        ),
      });
    if (target.rateLimitPerUser)
      // this doesn't work too well for very short values (as it says "a few seconds" rather than the actual value)
      // but it's good enough
      embed.addFields({
        name: guild.language.get("SLOWMODE"),
        value: dayjs(+new Date() + target.rateLimitPerUser * 1000).fromNow(
          true
        ),
      });
    embed.addFields({
      name: guild.language.get("DELETED_BY"),
      value: `${executor} (${executor.id})`,
    });
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    // if (raw) embed.addField(language.get("RAW"), raw);
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_DELETE).catch(() => {});
  }
}
