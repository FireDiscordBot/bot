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
  GuildForumTagData,
  MessageEmbed,
  NewsChannel,
  PermissionOverwriteManager,
  Permissions,
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
const KEY_PERMISSIONS = [
  "BAN_MEMBERS",
  "CHANGE_NICKNAME",
  "KICK_MEMBERS",
  "MANAGE_CHANNELS",
  "MANAGE_GUILD",
  "MANAGE_EMOJIS_AND_STICKERS",
  "MANAGE_MESSAGES",
  "MANAGE_NICKNAMES",
  "MANAGE_ROLES",
  "MANAGE_WEBHOOKS",
  "MENTION_EVERYONE",
  "VIEW_AUDIT_LOG",
  "VIEW_GUILD_INSIGHTS",
  "MANAGE_THREADS",
  "MODERATE_MEMBERS",
  "MANAGE_EVENTS",
];
const TEXT_AND_NEWS_TYPES = [0, 5];

type AuditLogActionMethod = (
  auditLogEntry: GuildAuditLogsEntry,
  guild: FireGuild
) => Promise<any>;

export default class GuildAuditLogEntryCreate extends Listener {
  guildMemberUpdate: GuildMemberUpdate;

  constructor() {
    super("guildAuditLogEntryCreate", {
      emitter: "client",
      event: "guildAuditLogEntryCreate",
    });
  }

  async exec(auditLogEntry: GuildAuditLogsEntry, guild: FireGuild) {
    if (typeof this[auditLogEntry.action] == "function")
      (this[auditLogEntry.action] as AuditLogActionMethod)(
        auditLogEntry,
        guild
      ).catch((e) => {
        this.client.sentry.captureException(e, {
          tags: {
            action: auditLogEntry.action,
            guild: guild.id,
            id: auditLogEntry.id,
          },
        });
      });
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

    for (const change of auditLogEntry.changes)
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
      // @ts-ignore, key not added yet
      else if (change.key == "bypasses_verification")
        this.guildMemberUpdate.logVerificationBypass(
          auditLogEntry,
          change,
          guild,
          {
            target,
            executor,
          }
        );
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
          type: target.type
            ? titleCase(target.type.replace(REPLACE_UNDERSCORE_REGEX, " "))
            : "Unknown",
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields([{ name: guild.language.get("NAME"), value: target.name }]);
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

    if ("nsfw" in target)
      embed.addFields({
        name: guild.language.get("AGE_RESTRICTED"),
        value: target.nsfw
          ? this.client.util.useEmoji("success")
          : this.client.util.useEmoji("error"),
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
    if (
      auditLogEntry.reason &&
      (target instanceof FireTextChannel
        ? target.topic != auditLogEntry.reason
        : true)
    )
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
    let parent = guild.channels.cache.find(
      (c) => "threads" in c && c.threads.cache.has(auditLogEntry.targetId)
    ) as NewsChannel | TextChannel | ForumChannel;
    const thread =
      parent?.threads.cache.get(auditLogEntry.targetId) ??
      // we should never need this, but just in case...
      ((await guild.channels
        .fetch(auditLogEntry.targetId)
        .catch(() => {})) as ThreadChannel);
    if (!thread) return; // probably private and missing perms
    if (!parent && thread.parent) parent = thread.parent; // might get it from fetch

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
          type: thread.type
            ? titleCase(thread.type.replace(REPLACE_UNDERSCORE_REGEX, " "))
            : "Unknown",
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields(
        [
          { name: guild.language.get("NAME"), value: thread.name },
          parent
            ? { name: guild.language.get("CHANNEL"), value: parent.toString() }
            : undefined,
          {
            name: guild.language.get("ARCHIVE"),
            value: Formatters.time(autoArchiveAt, "R"),
          },
          thread.rateLimitPerUser
            ? {
                name: guild.language.get("SLOWMODE"),
                value: dayjs(
                  +new Date() + thread.rateLimitPerUser * 1000
                ).fromNow(true),
              }
            : undefined,
          {
            name: guild.language.get("CREATED_BY"),
            value: executor ? `${executor} (${executor.id})` : thread.ownerId,
          },
        ].filter((field) => !!field)
      )
      .setFooter({ text: auditLogEntry.targetId });
    if (parent?.isText() && parent?.messages.cache.has(thread.id))
      embed.addFields({
        name: guild.language.get("THREAD_MESSAGE"),
        value: `[${guild.language.get("CLICK_TO_VIEW")}](${
          parent.messages.cache.get(thread.id).url
        })`,
      });
    if (parent?.type == "GUILD_FORUM" && thread.appliedTags.length) {
      const tags = thread.appliedTags
        .map((id) => parent.availableTags.find((t) => t.id == id))
        .filter((tag) => !!tag)
        .map((tag) =>
          tag.emoji?.id
            ? `<:emoji:${tag.emoji.id}> ${tag.name}`
            : tag.emoji?.name
            ? `${tag.emoji.name} ${tag.name}`
            : tag.name
        );
      embed.addFields({
        name: guild.language.get("TAGS"),
        value: this.client.util.shorten(tags, 1024, " - "),
      });
    }
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_CREATE).catch(() => {});
  }

  async ["CHANNEL_UPDATE"](
    auditLogEntry: GuildAuditLogsEntry<"CHANNEL_UPDATE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    let target = guild.channels.cache.get(auditLogEntry.targetId);

    const embed = new MessageEmbed()
      .setColor("#2ECC71")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("CHANNELUPDATELOG_AUTHOR", {
          type: target.type
            ? titleCase(target.type.replace(/_/g, " "))
            : "Unknown",
          channel: target.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields({
        name: guild.language.get("UPDATED_BY"),
        value: `${executor} (${executor.id})`,
      })
      .setFooter({ text: auditLogEntry.targetId });
    for (const change of auditLogEntry.changes) {
      switch (change.key) {
        case "name": {
          if (
            (change.old as string).length + (change.new as string).length <=
            1020
          )
            embed.addFields({
              name: guild.language.get("NAME"),
              value: `${change.old} ➜ ${change.new}`,
            });
          break;
        }
        case "topic": {
          const value = `${change.old || guild.language.get("NO_TOPIC")} ➜ ${
            change.new || guild.language.get("NO_TOPIC")
          }`;
          if (value.length <= 1024)
            embed.addFields({
              name: guild.language.get("TOPIC"),
              value,
            });
          break;
        }
        case "nsfw": {
          embed.addFields({
            name: guild.language.get("AGE_RESTRICTED"),
            value: `${
              change.old
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            } ➜ ${
              change.new
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            }`,
          });
          break;
        }
        case "rate_limit_per_user": {
          embed.addFields({
            name: guild.language.get("SLOWMODE"),
            value: `${
              change.old == 0
                ? guild.language.get("NO_SLOWMODE")
                : dayjs(+new Date() + (change.old as number) * 1000).fromNow(
                    true
                  )
            } ➜ ${
              change.new == 0
                ? guild.language.get("NO_SLOWMODE")
                : dayjs(+new Date() + (change.new as number) * 1000).fromNow(
                    true
                  )
            }`,
          });
          break;
        }
        case "type": {
          if (
            !TEXT_AND_NEWS_TYPES.includes(change.old as number) &&
            !TEXT_AND_NEWS_TYPES.includes(change.new as number)
          )
            break;
          embed.addFields({
            name: guild.language.get("ANNOUNCEMENT_CHANNEL"),
            value: `${
              change.old == 5
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            } ➜ ${
              change.new == 5
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            }`,
          });
          break;
        }
        case "default_auto_archive_duration": {
          embed.addFields({
            name: guild.language.get("DEFAULT_AUTO_ARCHIVE_DURATION"),
            value: `${dayjs(
              +new Date() + (change.old as number) * 60_000
            ).fromNow(true)} ➜ ${dayjs(
              +new Date() + (change.new as number) * 60_000
            ).fromNow(true)}`,
          });
          break;
        }
        // @ts-ignore
        case "available_tags": {
          const oldTags = (change.old as GuildForumTagData[])
            .map((tag) =>
              tag.emoji?.id
                ? `<:emoji:${tag.emoji.id}> ${tag.name}`
                : tag.emoji?.name
                ? `${tag.emoji.name} ${tag.name}`
                : tag.name
            )
            .filter((tag) => !!tag);
          const newTags = (change.new as GuildForumTagData[])
            .map((tag) =>
              tag.emoji?.id
                ? `<:emoji:${tag.emoji.id}> ${tag.name}`
                : tag.emoji?.name
                ? `${tag.emoji.name} ${tag.name}`
                : tag.name
            )
            .filter((tag) => !!tag);
          const deletedTags = oldTags.filter((tag) => !newTags.includes(tag));
          const createdTags = newTags.filter((tag) => !oldTags.includes(tag));
          if (deletedTags.length)
            embed.addFields({
              // I'm 99% sure this can only be a single item but we'll keep it as an array just in case
              // but the field name will look a lil' odd
              name: guild.language.get("DELETED_TAG"),
              value: this.client.util.shorten(deletedTags, 1024, " - "),
            });
          if (createdTags.length)
            embed.addFields({
              // same for this,
              name: guild.language.get("CREATED_TAG"),
              value: this.client.util.shorten(createdTags, 1024, " - "),
            });
          break;
        }
        // @ts-ignore
        case "default_reaction_emoji": {
          const oldEmoji = (change.old as unknown as {
            emoji_id: string;
            emoji_name: string;
          }) ?? {
            emoji_id: null,
            emoji_name: null,
          };
          const newEmoji = (change.new as unknown as {
            emoji_id: string;
            emoji_name: string;
          }) ?? {
            emoji_id: null,
            emoji_name: null,
          };
          embed.addFields({
            name: guild.language.get("DEFAULT_REACTION_EMOJI"),
            value: `${
              oldEmoji.emoji_id
                ? `<:emoji:${oldEmoji.emoji_id}> ${oldEmoji.emoji_name}`
                : oldEmoji.emoji_name
                ? `${oldEmoji.emoji_name}`
                : guild.language.get("NO_EMOJI")
            } ➜ ${
              newEmoji.emoji_id
                ? `<:emoji:${newEmoji.emoji_id}> ${newEmoji.emoji_name}`
                : newEmoji.emoji_name
                ? `${newEmoji.emoji_name}`
                : guild.language.get("NO_EMOJI")
            }`,
          });
          break;
        }
      }
    }
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    if (embed.fields.length == (auditLogEntry.reason ? 2 : 1)) return;
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_UPDATE).catch(() => {});
  }

  async ["THREAD_UPDATE"](
    auditLogEntry: GuildAuditLogsEntry<"THREAD_UPDATE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    let parent = guild.channels.cache.find(
      (c) => "threads" in c && c.threads.cache.has(auditLogEntry.targetId)
    ) as NewsChannel | TextChannel | ForumChannel;
    const thread =
      parent?.threads.cache.get(auditLogEntry.targetId) ??
      // we should never need this, but just in case...
      ((await guild.channels
        .fetch(auditLogEntry.targetId)
        .catch(() => {})) as ThreadChannel);
    if (!thread) return; // probably private and missing perms
    if (!parent && thread.parent) parent = thread.parent; // might get it from fetch

    const embed = new MessageEmbed()
      .setColor("#2ECC71")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("CHANNELUPDATELOG_AUTHOR", {
          type: thread.type
            ? titleCase(thread.type.replace(REPLACE_UNDERSCORE_REGEX, " "))
            : "Unknown",
          channel: thread.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields({
        name: guild.language.get("UPDATED_BY"),
        value: `${executor} (${executor.id})`,
      })
      .setFooter({ text: auditLogEntry.targetId });
    for (const change of auditLogEntry.changes) {
      switch (change.key) {
        case "name": {
          if (
            (change.old as string).length + (change.new as string).length <=
            1020
          )
            embed.addFields({
              name: guild.language.get("NAME"),
              value: `${change.old} ➜ ${change.new}`,
            });
          break;
        }
        case "archived": {
          embed.addFields({
            name: guild.language.get("ARCHIVED"),
            value: `${
              change.old
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            } ➜ ${
              change.new
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            }`,
          });
          break;
        }
        case "locked": {
          embed.addFields({
            name: guild.language.get("LOCKED"),
            value: `${
              change.old
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            } ➜ ${
              change.new
                ? this.client.util.useEmoji("success")
                : this.client.util.useEmoji("error")
            }`,
          });
          break;
        }
        // @ts-ignore
        case "applied_tags": {
          // @ts-ignore
          const oldTags = ((change.old as string[]) ?? [])
            .map((id) =>
              (parent as ForumChannel).availableTags.find((t) => t.id == id)
            )
            .filter((tag) => !!tag)
            .map((tag) =>
              tag.emoji?.id
                ? `<:emoji:${tag.emoji.id}> ${tag.name}`
                : tag.emoji?.name
                ? `${tag.emoji.name} ${tag.name}`
                : tag.name
            );
          // @ts-ignore
          const newTags = ((change.new as string[]) ?? [])
            .map((id) =>
              (parent as ForumChannel).availableTags.find((t) => t.id == id)
            )
            .filter((tag) => !!tag)
            .map((tag) =>
              tag.emoji?.id
                ? `<:emoji:${tag.emoji.id}> ${tag.name}`
                : tag.emoji?.name
                ? `${tag.emoji.name} ${tag.name}`
                : tag.name
            );
          const removedTags = oldTags.filter((tag) => !newTags.includes(tag));
          const addedTags = newTags.filter((tag) => !oldTags.includes(tag));
          if (removedTags.length)
            embed.addFields({
              name: guild.language.get("REMOVED_TAGS"),
              value: this.client.util.shorten(removedTags, 1024, " - "),
            });
          if (addedTags.length)
            embed.addFields({
              name: guild.language.get("ADDED_TAGS"),
              value: this.client.util.shorten(addedTags, 1024, " - "),
            });
          break;
        }
      }
    }
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    if (embed.fields.length == (auditLogEntry.reason ? 2 : 1)) return;
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_UPDATE).catch(() => {});
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
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("CHANNELDELETELOG_AUTHOR", {
          type: target.type
            ? titleCase(target.type.replace(REPLACE_UNDERSCORE_REGEX, " "))
            : "Unknown",
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
    // if (raw) embed.addFields({ name: language.get("RAW"), value: raw });
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
      type:
        // type can be missing here for some reason
        // so we'll just default to public thread
        (ReverseChannelTypes[
          auditLogEntry.target.type as number
        ] as keyof typeof ChannelTypes) ?? "GUILD_PUBLIC_THREAD",
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
      appliedTags:
        "applied_tags" in auditLogEntry.target
          ? (auditLogEntry.target.applied_tags as string[])
          : undefined,
    };

    const allForumTags = guild.channels.cache
      .filter((c) => c.type == "GUILD_FORUM")
      .map((c) => c as ForumChannel)
      .flatMap((c) => c.availableTags);

    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("CHANNELDELETELOG_AUTHOR", {
          type: target.type
            ? titleCase(target.type.replace(REPLACE_UNDERSCORE_REGEX, " "))
            : "Unknown",
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
          ? this.client.util.useEmoji("success")
          : this.client.util.useEmoji("error"),
      });
    if (typeof target.locked == "boolean")
      embed.addFields({
        name: guild.language.get("LOCKED"),
        value: target.locked
          ? this.client.util.useEmoji("success")
          : this.client.util.useEmoji("error"),
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
    if (target.appliedTags?.length && allForumTags.length) {
      const tags = target.appliedTags
        .map((id) => allForumTags.find((t) => t.id == id))
        .filter((tag) => !!tag)
        .map((tag) =>
          tag.emoji?.id
            ? `<:emoji:${tag.emoji.id}> ${tag.name}`
            : tag.emoji?.name
            ? `${tag.emoji.name} ${tag.name}`
            : tag.name
        );
      embed.addFields({
        name: guild.language.get("TAGS"),
        value: this.client.util.shorten(tags, 1024, " - "),
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
    // if (raw) embed.addFields({ name: language.get("RAW"), value: raw });
    await guild.actionLog(embed, ActionLogTypes.CHANNEL_DELETE).catch(() => {});
  }

  async ["ROLE_CREATE"](
    auditLogEntry: GuildAuditLogsEntry<"ROLE_CREATE">,
    guild: FireGuild
  ) {
    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    const target = guild.roles.cache.get(auditLogEntry.targetId);

    const embed = new MessageEmbed()
      .setColor(target.color || "#2ECC71")
      .setTimestamp(target.createdAt)
      .setAuthor({
        name: guild.language.get("ROLECREATELOG_AUTHOR", {
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields([
        { name: guild.language.get("NAME"), value: target.name },
        {
          name: guild.language.get("POSITION"),
          value: target.position.toString(),
        },
        {
          name: guild.language.get("HOISTED"),
          value: target.hoist
            ? this.client.util.useEmoji("success")
            : this.client.util.useEmoji("error"),
        },
        {
          name: guild.language.get("MENTIONABLE"),
          value: target.mentionable
            ? this.client.util.useEmoji("success")
            : this.client.util.useEmoji("error"),
        },
      ])
      .setFooter({ text: auditLogEntry.targetId });
    if (target.permissions.bitfield)
      embed.addFields({
        name: guild.language.get("PERMISSIONS_TEXT"),
        value: this.client.util.shorten(
          target.permissions
            .toArray()
            // sort the permissions so the key permissions are at the top
            // and less likely to be cut off
            .sort((a, b) => (KEY_PERMISSIONS.includes(a) ? -1 : 1))
            .map((p) =>
              this.client.util.cleanPermissionName(p, guild.language)
            ),
          1024,
          ", "
        ),
      });
    embed.addFields({
      name: guild.language.get("CREATED_BY"),
      value: `${executor} (${executor.id})`,
    });
    if (auditLogEntry.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: auditLogEntry.reason,
      });
    await guild.actionLog(embed, ActionLogTypes.ROLE_CREATE).catch(() => {});
  }

  async ["ROLE_DELETE"](
    auditLogEntry: GuildAuditLogsEntry<"ROLE_DELETE">,
    guild: FireGuild
  ) {
    // TODO: maybe move to roleDelete event instead of having in audit?
    // We need to remove non-existent roles from permroles
    // to avoid an infinite loop of trying to set permissions
    // due to not seeing the permission set as the role doesn't exist
    if (guild.permRoles?.has(auditLogEntry.targetId)) {
      guild.permRoles.delete(auditLogEntry.targetId);
      await this.client.db
        .query("DELETE FROM permroles WHERE gid=$1 AND rid=$2;", [
          guild.id,
          auditLogEntry.targetId,
        ])
        .catch(() => {});
    }

    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);
    if (!guild.logger.isActionEnabled()) return;

    const executor = (await guild.members.fetch(
      auditLogEntry.executorId
    )) as FireMember;
    const target = guild.roles.cache.get(auditLogEntry.targetId) ?? {
      // if we're here, the role was already evicted from the cache
      // so we need to construct an object with the data we need
      name: auditLogEntry.changes.find((c) => c.key == "name").old as string,
      // permissions may be inaccurate due to it being sent as a number
      // rather than a string
      permissions: new Permissions(
        BigInt(
          auditLogEntry.changes.find((c) => c.key == "permissions")
            .old as number
        )
      ),
      color: auditLogEntry.changes.find((c) => c.key == "color").old as number,
      hoist: auditLogEntry.changes.find((c) => c.key == "hoist").old as boolean,
      mentionable: auditLogEntry.changes.find((c) => c.key == "mentionable")
        .old as boolean,
    };

    const embed = new MessageEmbed()
      .setColor(target.color || "#E74C3C")
      .setTimestamp(auditLogEntry.createdAt)
      .setAuthor({
        name: guild.language.get("ROLEDELETELOG_AUTHOR", {
          guild: guild.name,
        }),
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields([
        { name: guild.language.get("NAME"), value: target.name },
        {
          name: guild.language.get("HOISTED"),
          value: target.hoist
            ? this.client.util.useEmoji("success")
            : this.client.util.useEmoji("error"),
        },
        {
          name: guild.language.get("MENTIONABLE"),
          value: target.mentionable
            ? this.client.util.useEmoji("success")
            : this.client.util.useEmoji("error"),
        },
      ])
      .setFooter({ text: auditLogEntry.targetId });
    if (target.permissions.bitfield)
      embed.addFields({
        name: guild.language.get("PERMISSIONS_TEXT"),
        value: this.client.util.shorten(
          target.permissions
            .toArray()
            // sort the permissions so the key permissions are at the top
            // and less likely to be cut off
            .sort((a, b) => (KEY_PERMISSIONS.includes(a) ? -1 : 1))
            .map((p) =>
              this.client.util.cleanPermissionName(p, guild.language)
            ),
          1024,
          ", "
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
    await guild.actionLog(embed, ActionLogTypes.ROLE_DELETE).catch(() => {});
  }
}
