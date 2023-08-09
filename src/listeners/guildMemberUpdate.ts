import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import {
  constants,
  CouponType,
  MemberLogTypes,
} from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import RolePersist from "@fire/src/commands/Premium/rolepersist";
import {
  AuditLogChange,
  Formatters,
  GuildAuditLogsEntry,
  MessageEmbed,
  Permissions,
  Snowflake,
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
        const coupon: CouponType =
          newMember.settings.get<CouponType>("premium.coupon");
        if (
          coupon == CouponType.BOOSTER &&
          !newMember.roles.cache.has("620512846232551427")
        )
          this.client.util.deleteSpecialCoupon(newMember);
        else if (
          coupon == CouponType.TWITCHSUB &&
          !newMember.roles.cache.has("745392985151111338")
        )
          this.client.util.deleteSpecialCoupon(newMember);
        else if (
          coupon == CouponType.BOOSTER_AND_SUB &&
          (!newMember.roles.cache.has("620512846232551427") ||
            !newMember.roles.cache.has("745392985151111338"))
        )
          this.client.util.deleteSpecialCoupon(newMember);
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
        newMember.guild.members.me?.permissions?.has("MODERATE_MEMBERS");
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
          roles,
          newMember.guild.members.me as FireMember
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
          Permissions.FLAGS.MANAGE_ROLES
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
            Permissions.FLAGS.MANAGE_ROLES
          )
        )
          await newMember.roles
            .add(role, newMember.guild.language.get("AUTOROLE_REASON"))
            .catch(() => {});
      }
    }

    if (
      !newMember.guild.settings.has("log.members") ||
      !newMember.guild.members.me.permissions.has(
        Permissions.FLAGS.VIEW_AUDIT_LOG
      )
    )
      return;

    const isPartial = oldMember.partial && newMember.partial;
    const hasRoleUpdates =
      oldMember?.roles?.cache.size != newMember.roles.cache.size;
    const hasMemberUpdate =
      oldMember?.nickname != newMember.nickname ||
      oldMember?.communicationDisabledUntilTimestamp !=
        newMember.communicationDisabledUntilTimestamp;

    if (
      !newMember.guild.fetchingRoleUpdates &&
      !(!isPartial && !hasRoleUpdates)
    ) {
      newMember.guild.fetchingRoleUpdates = true;
      await this.checkRoleUpdates(newMember).catch(() => {});
      newMember.guild.fetchingRoleUpdates = false;
    }

    if (
      !newMember.guild.fetchingMemberUpdates &&
      !(!isPartial && !hasMemberUpdate)
    ) {
      newMember.guild.fetchingMemberUpdates = true;
      await this.checkMemberUpdates(newMember);
      newMember.guild.fetchingMemberUpdates = false;
    }
  }

  async checkRoleUpdates(newMember: FireMember) {
    const latestId = newMember.guild.settings.get<string>(
      "auditlog.member_role_update.latestid",
      "0"
    );

    const auditLogActions = await newMember.guild
      .fetchAuditLogs({
        limit: latestId == "0" ? 5 : 15,
        type: "MEMBER_ROLE_UPDATE",
      })
      .catch(() => {});
    if (!auditLogActions || !auditLogActions.entries?.size) return;

    const ignoredReasons = [
      newMember.guild.language.get("AUTOROLE_REASON"),
      newMember.guild.language.get("REACTIONROLE_ROLE_REASON"),
      newMember.guild.language.get("REACTIONROLE_ROLE_REMOVE_REASON"),
      newMember.guild.language.get("VCROLE_ADD_REASON"),
      newMember.guild.language.get("VCROLE_REMOVE_REASON"),
      newMember.guild.language.get("RANKS_JOIN_REASON"),
      newMember.guild.language.get("RANKS_LEAVE_REASON"),
    ];

    let filteredActions = auditLogActions.entries.filter(
      (entry) =>
        entry.id > latestId &&
        !(
          ignoredReasons.includes(entry.reason) &&
          entry.executor?.id == this.client.user.id
        )
    );
    if (!filteredActions.size) return;

    // @ts-ignore
    filteredActions = filteredActions.sort((a, b) => a.id - b.id);

    newMember.guild.settings.set<string>(
      "auditlog.member_role_update.latestid",
      filteredActions.last()?.id
    );

    for (const [, action] of filteredActions) {
      for (const change of action.changes) {
        if (change.key == "$add")
          await this.logRoleAdd(action, change, newMember.guild).catch(
            () => {}
          );
        else if (change.key == "$remove")
          await this.logRoleRemove(action, change, newMember.guild).catch(
            () => {}
          );
      }
    }
  }

  async checkMemberUpdates(newMember: FireMember) {
    const latestId = newMember.guild.settings.get<string>(
      "auditlog.member_update.latestid",
      "0"
    );

    setTimeout(() => (newMember.guild.fetchingMemberUpdates = false), 30000);
    const auditLogActions = await newMember.guild
      .fetchAuditLogs({
        limit: latestId == "0" ? 5 : 15,
        type: "MEMBER_UPDATE",
      })
      .catch(() => {});
    if (!auditLogActions || !auditLogActions.entries?.size) return;

    const badName = newMember.guild.settings.get<string>(
      "utils.badname",
      `John Doe ${newMember.user.discriminator}`
    );
    const ignoredReasons = [
      newMember.guild.language.get("AUTODECANCER_NICKNAME_REASON"),
      newMember.guild.language.get("AUTODECANCER_DISPLAYNAME_REASON"),
      newMember.guild.language.get("AUTODECANCER_USERNAME_REASON"),
      newMember.guild.language.get("AUTODECANCER_NICKTODISPLAY_REASON"),
      newMember.guild.language.get("AUTODECANCER_NICKTOUSER_REASON"),
      newMember.guild.language.get("AUTODECANCER_BADNAME_REASON"),
      newMember.guild.language.get("AUTODEHOIST_NICKTODISPLAY_REASON"),
      newMember.guild.language.get("AUTODEHOIST_USERNAMEFALLBACK_REASON"),
      newMember.guild.language.get("AUTODEHOIST_BADNAME_REASON"),
      newMember.guild.language.get("AUTODEHOISTANDDECANCER_RESET_REASON"),
    ];

    let filteredActions = auditLogActions.entries.filter(
      (entry) =>
        entry.id > latestId &&
        !(
          ignoredReasons.includes(entry.reason) &&
          entry.executor?.id == this.client.user.id
        ) &&
        !!entry.changes.filter(
          (change) =>
            (change.key == "nick" &&
              change.old != badName &&
              change.new != badName) ||
            change.key == "communication_disabled_until"
        ).length
    );
    if (!filteredActions.size) return;

    // @ts-ignore
    filteredActions = filteredActions.sort((a, b) => a.id - b.id);

    newMember.guild.settings.set<string>(
      "auditlog.member_update.latestid",
      filteredActions.last()?.id
    );

    for (const [, action] of filteredActions) {
      for (const change of action.changes) {
        if (
          change.key == "nick" &&
          !(
            (!change.old && change.new == badName) ||
            (!change.new && change.old == badName)
          )
        )
          await this.logNickChange(action, change, newMember.guild);
        else if (
          change.key == "communication_disabled_until" &&
          (change.new || change.old)
        )
          await this.logTimeout(action, change, newMember.guild);
      }
    }
  }

  async logRoleAdd(
    action: GuildAuditLogsEntry,
    change: AuditLogChange,
    guild: FireGuild
  ) {
    // @ts-ignore
    const targetId = action.target.id;
    const target =
      action.target instanceof FireMember
        ? action.target
        : ((await guild.members.fetch(targetId).catch(() => {})) as FireMember);
    const executor = await guild.members
      .fetch(action.executor.id)
      .catch(() => {});
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const roleIds = (change.new as { name: string; id: string }[]).map(
      (newChange) => newChange.id
    );
    const roles = guild.roles.cache.filter((role) => roleIds.includes(role.id));
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(roles.random().hexColor as `#${string}`)
      .addField(
        guild.language.get("ROLEADDLOG_FIELD_TITLE"),
        roles.map((role) => role.toString()).join(" - ")
      )
      .setFooter(targetId);
    if (executor && executor.id != targetId)
      embed.addField(guild.language.get("MODERATOR"), executor.toString());
    if (action.reason)
      embed.addField(guild.language.get("REASON"), action.reason);
    await guild.memberLog(embed, MemberLogTypes.ROLES_ADD).catch(() => {});
  }

  async logRoleRemove(
    action: GuildAuditLogsEntry,
    change: AuditLogChange,
    guild: FireGuild
  ) {
    // @ts-ignore
    const targetId = action.target.id;
    const target =
      action.target instanceof FireMember
        ? action.target
        : ((await guild.members.fetch(targetId).catch(() => {})) as FireMember);
    const executor = await guild.members
      .fetch(action.executor.id)
      .catch(() => {});
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const roleIds = (change.new as { name: string; id: string }[]).map(
      (newChange) => newChange.id
    );
    const roles = guild.roles.cache.filter((role) => roleIds.includes(role.id));
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(roles.random().hexColor as `#${string}`)
      .addField(
        guild.language.get("ROLEREMOVELOG_FIELD_TITLE"),
        roles.map((role) => role.toString()).join(" - ")
      )
      .setFooter(targetId);
    if (executor && executor.id != targetId)
      embed.addField(guild.language.get("MODERATOR"), executor.toString());
    if (action.reason)
      embed.addField(guild.language.get("REASON"), action.reason);
    await guild.memberLog(embed, MemberLogTypes.ROLES_REMOVE).catch(() => {});
  }

  async logTimeout(
    action: GuildAuditLogsEntry,
    change: AuditLogChange,
    guild: FireGuild
  ) {
    // @ts-ignore
    const targetId = action.target.id;
    const target =
      action.target instanceof FireMember
        ? action.target
        : ((await guild.members.fetch(targetId).catch(() => {})) as FireMember);
    const executor = await guild.members
      .fetch(action.executor.id)
      .catch(() => {});
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(target ? target?.displayColor : "#ffffff")
      .setFooter(targetId);
    if (executor && executor.id != targetId)
      embed.addField(guild.language.get("MODERATOR"), executor.toString());
    if (change.old)
      embed.addField(
        guild.language.get("TIMEOUTLOG_REMOVED"),
        `${guild.language.get("UNTIL")} ${Formatters.time(
          new Date(change.old as string),
          "R"
        )}`
      );
    if (change.new)
      embed.addField(
        guild.language.get("TIMEOUTLOG_GIVEN"),
        `${guild.language.get("UNTIL")} ${Formatters.time(
          new Date(change.new as string),
          "R"
        )}`
      );
    if (embed.fields.length <= 1) return;
    if (action.reason)
      embed.addField(guild.language.get("REASON"), action.reason);
    await guild.memberLog(embed, MemberLogTypes.MEMBER_UPDATE).catch(() => {});
  }

  async logNickChange(
    action: GuildAuditLogsEntry,
    change: AuditLogChange,
    guild: FireGuild
  ) {
    // @ts-ignore
    const targetId = action.target.id;
    const target =
      action.target instanceof FireMember
        ? action.target
        : ((await guild.members.fetch(targetId).catch(() => {})) as FireMember);
    const executor = await guild.members
      .fetch(action.executor.id)
      .catch(() => {});
    if (executor && executor.user.bot && executor.id != this.client.user.id)
      return;
    const embed = new MessageEmbed()
      .setAuthor({
        name: target ? target.toString() : targetId,
        iconURL: target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setTimestamp(action.createdTimestamp)
      .setColor(target ? target?.displayColor : "#ffffff")
      .setFooter(targetId);
    if (executor && executor.id != targetId)
      embed.addField(guild.language.get("MODERATOR"), executor.toString());
    if (change.old)
      embed.addField(
        guild.language.get("NICKCHANGELOG_OLD_NICK"),
        change.old.toString() || constants.escapedShruggie
      );
    if (change.new)
      embed.addField(
        guild.language.get("NICKCHANGELOG_NEW_NICK"),
        change.new.toString() || constants.escapedShruggie
      );
    if (embed.fields.length <= 1) return;
    if (action.reason)
      embed.addField(guild.language.get("REASON"), action.reason);
    await guild.memberLog(embed, MemberLogTypes.MEMBER_UPDATE).catch(() => {});
  }
}
