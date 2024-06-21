import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Listener } from "@fire/lib/util/listener";
import { Collection, GuildAuditLogsEntry, MessageEmbed } from "discord.js";
import GuildMemberUpdate from "./guildMemberUpdate";
import { FireUser } from "@fire/lib/extensions/user";
import {
  ActionLogTypes,
  ModLogTypes,
  titleCase,
} from "@fire/lib/util/constants";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { GuildLogManager } from "@fire/lib/util/logmanager";
import * as dayjs from "dayjs";

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

    if (guild.settings.has("log.action")) {
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(target.createdAt)
        .setAuthor({
          name: guild.language.get("CHANNELCREATELOG_AUTHOR", {
            type: titleCase(target.type.replace(/_/g, " ")),
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
      await guild
        .actionLog(embed, ActionLogTypes.CHANNEL_CREATE)
        .catch(() => {});
    }
  }
}
