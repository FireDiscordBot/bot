import { GuildAuditLogsEntry, MessageEmbed, TextChannel } from "discord.js";
import { FireMember } from "../../lib/extensions/guildmember";
import RolePersist from "../commands/Premium/rolepersist";
import { Listener } from "../../lib/util/listener";
import Sk1er from "../modules/sk1er";
import { FireGuild } from "../../lib/extensions/guild";
import { AuditLogChange } from "discord.js";

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

    if (
      newMember.guild.mutes.has(newMember.id) &&
      !newMember.roles.cache.has(newMember.guild.muteRole.id)
    ) {
      if (+new Date() < newMember.guild.mutes.get(newMember.id))
        await newMember.roles.add(newMember.guild.muteRole).catch(() => {});
    }

    if (newMember.guild.persistedRoles?.has(newMember.id)) {
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
          newMember.guild.me as FireMember
        );
      }
    }

    if (!newMember.pending) {
      let autoroleId: string;
      const delay = newMember.guild.settings.get(
        "mod.autorole.waitformsg",
        false
      );
      if (newMember.user.bot)
        autoroleId = newMember.guild.settings.get("mod.autobotrole", null);
      else autoroleId = newMember.guild.settings.get("mod.autorole", null);

      if (
        autoroleId &&
        (newMember.user.bot || !delay) &&
        !newMember.roles.cache.has(autoroleId)
      ) {
        const role = newMember.guild.roles.cache.get(autoroleId);
        if (role && newMember.guild.me.hasPermission("MANAGE_ROLES"))
          await newMember.roles
            .add(
              role,
              newMember.guild.language.get("AUTOROLE_REASON") as string
            )
            .catch(() => {});
      }
    }

    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (
      sk1erModule &&
      !newMember.partial &&
      newMember.guild.id == sk1erModule.guildId
    ) {
      if (!newMember.roles.cache.has("585534346551754755")) {
        const removed = await sk1erModule
          .removeNitroPerks(newMember)
          .catch(() => false);
        if (typeof removed == "boolean" && removed)
          (sk1erModule.guild.channels.cache.get(
            "411620457754787841"
          ) as TextChannel).send(
            sk1erModule.guild.language.get(
              "SK1ER_NITRO_PERKS_REMOVED",
              newMember.toMention()
            ),
            { allowedMentions: { users: [newMember.id] } }
          );
      }
    }

    if (
      (!newMember.guild.hasExperiment("2tWDukMy-gpH_Pf4_BVfP") ||
        !newMember.guild.settings.has("log.action")) &&
      !this.client.config.dev
    )
      return;

    if (newMember.guild.fetchingRoleUpdates) return;

    const latestId: string = newMember.guild.settings.get(
      "auditlog.member_role_update.latestid",
      "0"
    );

    newMember.guild.fetchingRoleUpdates = true;
    const auditLogActions = await newMember.guild
      .fetchAuditLogs({
        limit: latestId == "0" ? 3 : 10,
        type: "MEMBER_ROLE_UPDATE",
      })
      .catch(() => {});
    newMember.guild.fetchingRoleUpdates = false;
    if (!auditLogActions || !auditLogActions.entries?.size) return;

    let filteredActions = auditLogActions.entries.filter(
      (entry) => entry.id > latestId
    );
    if (!filteredActions.size) return;

    // @ts-ignore
    filteredActions = filteredActions.sort((a, b) => a.id - b.id);

    newMember.guild.settings.set(
      "auditlog.member_role_update.latestid",
      filteredActions.last()?.id
    );

    for (const [, action] of filteredActions) {
      for (const change of action.changes) {
        if (
          change.key == "$add" &&
          (newMember.guild.hasExperiment("2tWDukMy-gpH_Pf4_BVfP", 1) ||
            newMember.guild.hasExperiment("2tWDukMy-gpH_Pf4_BVfP", 3))
        )
          await this.logRoleAdd(
            action,
            change,
            newMember.guild
          ).catch(() => {});
        else if (
          change.key == "$remove" &&
          (newMember.guild.hasExperiment("2tWDukMy-gpH_Pf4_BVfP", 2) ||
            newMember.guild.hasExperiment("2tWDukMy-gpH_Pf4_BVfP", 3))
        )
          await this.logRoleRemove(
            action,
            change,
            newMember.guild
          ).catch(() => {});
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
        : await guild.members.fetch(targetId).catch(() => {});
    const executor = await guild.members
      .fetch(action.executor.id)
      .catch(() => {});
    const roleIds = (change.new as { name: string; id: string }[]).map(
      (newChange) => newChange.id
    );
    const roles = guild.roles.cache.filter((role) => roleIds.includes(role.id));
    const embed = new MessageEmbed()
      .setAuthor(
        target ? target.toString() : targetId,
        target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .setTimestamp(action.createdTimestamp)
      .setColor(roles.random().hexColor)
      .addField(
        guild.language.get("ROLEADDLOG_FIELD_TITLE"),
        roles.map((role) => role.toString()).join(" - ")
      )
      .addField(
        guild.language.get("MODERATOR"),
        executor ? executor.toString() : "???"
      )
      .setFooter(targetId);
    if (action.reason)
      embed.addField(guild.language.get("REASON"), action.reason);
    await guild.actionLog(embed, "roles_add").catch(() => {});
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
        : await guild.members.fetch(targetId).catch(() => {});
    const executor = await guild.members
      .fetch(action.executor.id)
      .catch(() => {});
    const roleIds = (change.new as { name: string; id: string }[]).map(
      (newChange) => newChange.id
    );
    const roles = guild.roles.cache.filter((role) => roleIds.includes(role.id));
    const embed = new MessageEmbed()
      .setAuthor(
        target ? target.toString() : targetId,
        target
          ? target.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : guild.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .setTimestamp(action.createdTimestamp)
      .setColor(roles.random().hexColor)
      .addField(
        guild.language.get("ROLEREMOVELOG_FIELD_TITLE"),
        roles.map((role) => role.toString()).join(" - ")
      )
      .addField(
        guild.language.get("MODERATOR"),
        executor ? executor.toString() : "???"
      )
      .setFooter(targetId);
    if (action.reason)
      embed.addField(guild.language.get("REASON"), action.reason);
    await guild.actionLog(embed, "roles_remove").catch(() => {});
  }
}
