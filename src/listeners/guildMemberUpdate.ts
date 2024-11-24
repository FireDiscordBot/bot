import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import {
  constants,
  CouponType,
  MemberLogTypes,
} from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import RolePersist from "@fire/src/commands/Premium/rolepersist";
import { Severity } from "@sentry/node";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  AuditLogChange,
  Formatters,
  GuildAuditLogsEntry,
  MessageEmbed,
} from "discord.js";

export default class GuildMemberUpdate extends Listener {
  constructor() {
    super("guildMemberUpdate", {
      emitter: "client",
      event: "guildMemberUpdate",
    });
  }

  async exec(oldMember: FireMember, newMember: FireMember) {
    // Both of these will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    newMember.dehoistAndDecancer();

    if (newMember.guild?.id == this.client.config.fireguildId) {
      if (newMember.settings?.has("premium.coupon")) {
        let deleted: boolean;
        const coupon: CouponType =
          newMember.settings.get<CouponType>("premium.coupon");
        if (
          coupon == CouponType.BOOSTER &&
          !newMember.roles.cache.has("620512846232551427")
        )
          deleted = await this.client.util.deleteSpecialCoupon(newMember);
        else if (
          coupon == CouponType.TWITCHSUB &&
          !newMember.roles.cache.has("745392985151111338")
        )
          deleted = await this.client.util.deleteSpecialCoupon(newMember);
        else if (
          coupon == CouponType.BOOSTER_AND_SUB &&
          (!newMember.roles.cache.has("620512846232551427") ||
            !newMember.roles.cache.has("745392985151111338"))
        )
          deleted = await this.client.util.deleteSpecialCoupon(newMember);

        if (!deleted)
          this.client.sentry.captureEvent({
            level: Severity.Error,
            message: "Failed to delete premium special coupon",
            user: {
              id: newMember.id,
              username: newMember.user.toString(),
            },
            tags: {
              couponType: newMember.settings.get<CouponType>("premium.coupon"),
            },
          });
      }
    }

    if (
      newMember.guild.mutes.has(newMember.id) &&
      !newMember.roles.cache.has(newMember.guild.muteRole?.id) &&
      !newMember.communicationDisabledUntilTimestamp
    ) {
      await this.client.util.sleep(5000); // wait a bit to ensure it isn't from being unmuted
      const until = newMember.guild.mutes.get(newMember.id);
      const canTimeOut =
        until &&
        until < +new Date() + 2419199999 &&
        newMember.guild.members.me?.permissions?.has(
          PermissionFlagsBits.ModerateMembers
        );
      if (until == 0 || +new Date() < until)
        canTimeOut
          ? await newMember
              .disableCommunicationUntil(new Date(until))
              .catch(() => {})
          : await newMember.roles.add(newMember.guild.muteRole).catch(() => {});
    }

    // maybe fix role persist removing on member upddte shortly after joining
    const joinedRecently = +new Date() - newMember.joinedTimestamp < 15000;

    if (!newMember.guild.persistedRoles)
      await newMember.guild.loadPersistedRoles();
    if (newMember.guild.persistedRoles?.has(newMember.id) && !joinedRecently) {
      const ids = newMember.guild.persistedRoles.get(newMember.id);
      const roles = newMember.guild.persistedRoles
        .get(newMember.id)
        .map((id) => newMember.roles.cache.get(id))
        .filter((role) => !!role);
      if (ids.length != roles.length && roles.length >= 1) {
        newMember.guild.persistedRoles.set(
          newMember.id,
          roles.map((role) => role.id)
        );
        await this.client.db
          .query("UPDATE rolepersists SET roles=$1 WHERE gid=$2 AND uid=$3;", [
            roles.map((role) => role.id),
            newMember.guild.id,
            newMember.id,
          ])
          .catch(() => {});
      } else if (ids.length != roles.length && !roles.length) {
        newMember.guild.persistedRoles.delete(newMember.id);
        await this.client.db
          .query("DELETE FROM rolepersists WHERE gid=$1 AND uid=$2;", [
            newMember.guild.id,
            newMember.id,
          ])
          .catch(() => {});
      }

      if (
        newMember.guild.settings.has("log.moderation") &&
        ids.length != roles.length
      ) {
        const command = this.client.getCommand("rolepersist") as RolePersist;
        await command.sendLog(
          newMember,
          newMember.guild.roles.cache
            .filter((role) => ids.includes(role.id) && !roles.includes(role))
            .toJSON(),
          newMember.guild.members.me as FireMember,
          newMember.guild.language.get("ROLEPERSIST_AUTO_REMOVE_REASON")
        );
      }
    }

    if (newMember.user.bot) {
      const role = newMember.guild.roles.cache.get(
        newMember.guild.settings.get<Snowflake>("mod.autobotrole", null)
      );
      if (
        role &&
        newMember.guild.members.me.permissions.has(
          PermissionFlagsBits.ManageRoles
        )
      )
        await newMember.roles
          .add(role, newMember.guild.language.get("AUTOROLE_REASON"))
          .catch(() => {});
    } else {
      const autoroleId = newMember.guild.settings.get<Snowflake>(
        "mod.autorole",
        null
      );
      const delay = newMember.guild.settings.get<boolean>(
        "mod.autorole.waitformsg",
        false
      );

      if (
        autoroleId &&
        !delay &&
        !newMember.roles.cache.has(autoroleId) &&
        !newMember.user.bot
      ) {
        const role = newMember.guild.roles.cache.get(autoroleId);
        if (
          role &&
          newMember.guild.members.me.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        )
          await newMember.roles
            .add(role, newMember.guild.language.get("AUTOROLE_REASON"))
            .catch(() => {});
      }
    }
  }

  async logRoleAdd(
    action: GuildAuditLogsEntry<"MEMBER_ROLE_UPDATE">,
    change: AuditLogChange,
    guild: FireGuild,
    members: {
      target: FireMember;
      executor: FireMember;
    }
  ) {
    const target = members.target;
    const executor = members.executor;
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const roleIds = (change.new as { name: string; id: string }[]).map(
      (newChange) => newChange.id
    );
    const roles = guild.roles.cache.filter((role) => roleIds.includes(role.id));
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : action.targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(
        roles.filter((r) => !!r.color).random()?.hexColor ??
          roles.first()?.hexColor
      )
      .addFields(
        [
          {
            name: guild.language.get("ROLEADDLOG_FIELD_TITLE"),
            value: roles.map((role) => role.toString()).join(" - "),
          },
          executor && executor.id != action.targetId
            ? {
                name: guild.language.get("MODERATOR"),
                value: executor.toString(),
              }
            : null,
          action.reason
            ? {
                name: guild.language.get("REASON"),
                value: action.reason,
              }
            : null,
        ].filter((field) => !!field)
      )

      .setFooter({ text: action.targetId });
    await guild.memberLog(embed, MemberLogTypes.ROLES_ADD).catch(() => {});
  }

  async logRoleRemove(
    action: GuildAuditLogsEntry<"MEMBER_ROLE_UPDATE">,
    change: AuditLogChange,
    guild: FireGuild,
    members: {
      target: FireMember;
      executor: FireMember;
    }
  ) {
    const target = members.target;
    const executor = members.executor;
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const roleIds = (change.new as { name: string; id: string }[]).map(
      (newChange) => newChange.id
    );
    const roles = guild.roles.cache.filter((role) => roleIds.includes(role.id));
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : action.targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(
        roles.filter((r) => !!r.color).random()?.hexColor ??
          roles.first()?.hexColor
      )
      .addFields(
        [
          {
            name: guild.language.get("ROLEREMOVELOG_FIELD_TITLE"),
            value: roles.map((role) => role.toString()).join(" - "),
          },
          executor && executor.id != action.targetId
            ? {
                name: guild.language.get("MODERATOR"),
                value: executor.toString(),
              }
            : null,
          action.reason
            ? {
                name: guild.language.get("REASON"),
                value: action.reason,
              }
            : null,
        ].filter((field) => !!field)
      )
      .setFooter({ text: action.targetId });
    await guild.memberLog(embed, MemberLogTypes.ROLES_REMOVE).catch(() => {});
  }

  async logTimeout(
    action: GuildAuditLogsEntry<"MEMBER_UPDATE">,
    change: AuditLogChange,
    guild: FireGuild,
    members: {
      target: FireMember;
      executor: FireMember;
    }
  ) {
    const target = members.target;
    const executor = members.executor;
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : action.targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(
        target && target.displayColor
          ? target?.displayColor
          : executor.displayColor ?? "#FFFFFF"
      )
      .setFooter({ text: action.targetId })
      .addFields(
        [
          {
            name: guild.language.get("TIMEOUTLOG_GIVEN"),
            value: Formatters.time(new Date(change.new as string), "R"),
          },
          executor && executor.id != action.targetId
            ? {
                name: guild.language.get("MODERATOR"),
                value: executor.toString(),
              }
            : null,
          action.reason
            ? {
                name: guild.language.get("REASON"),
                value: action.reason,
              }
            : null,
        ].filter((field) => !!field)
      );
    await guild.memberLog(embed, MemberLogTypes.MEMBER_UPDATE).catch(() => {});
  }

  async logNickChange(
    action: GuildAuditLogsEntry<"MEMBER_UPDATE">,
    change: AuditLogChange,
    guild: FireGuild,
    members: {
      target: FireMember;
      executor: FireMember;
    }
  ) {
    const target = members.target;
    const executor = members.executor;
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : action.targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(
        target && target.displayColor
          ? target?.displayColor
          : executor.displayColor ?? "#FFFFFF"
      )
      .addFields(
        [
          executor && executor.id != action.targetId
            ? {
                name: guild.language.get("MODERATOR"),
                value: executor.toString(),
              }
            : null,
          change.old
            ? {
                name: guild.language.get("NICKCHANGELOG_OLD_NICK"),
                value: change.old.toString() || constants.escapedShruggie,
              }
            : null,
          change.new
            ? {
                name: guild.language.get("NICKCHANGELOG_NEW_NICK"),
                value: change.new.toString() || constants.escapedShruggie,
              }
            : null,
          action.reason
            ? {
                name: guild.language.get("REASON"),
                value: action.reason,
              }
            : null,
        ].filter((field) => !!field)
      )
      .setFooter({ text: action.targetId });
    if (embed.fields.length)
      await guild
        .memberLog(embed, MemberLogTypes.MEMBER_UPDATE)
        .catch(() => {});
  }

  async logVerificationBypass(
    action: GuildAuditLogsEntry<"MEMBER_UPDATE">,
    change: AuditLogChange,
    guild: FireGuild,
    members: {
      target: FireMember;
      executor: FireMember;
    }
  ) {
    const target = members.target;
    const executor = members.executor;
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : action.targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(
        target && target.displayColor
          ? target?.displayColor
          : executor.displayColor ?? "#FFFFFF"
      )
      .setFooter({ text: action.targetId })
      .addFields({
        name: guild.language.get("VERIFICATIONBYPASSLOG_FIELD_TITLE"),
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
    if (executor && executor.id != action.targetId)
      embed.addFields({
        name: guild.language.get("MODERATOR"),
        value: executor.toString(),
      });
    if (action.reason)
      embed.addFields({
        name: guild.language.get("REASON"),
        value: action.reason,
      });
    await guild.memberLog(embed, MemberLogTypes.MEMBER_UPDATE).catch(() => {});
  }
}
