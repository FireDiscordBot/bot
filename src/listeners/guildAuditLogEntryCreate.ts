import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Listener } from "@fire/lib/util/listener";
import { Collection, GuildAuditLogsEntry } from "discord.js";
import GuildMemberUpdate from "./guildMemberUpdate";

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
      user: [auditLogEntry.target.id, auditLogEntry.executor.id],
    })) as Collection<string, FireMember>;
    const target = targetAndExecutor.get(auditLogEntry.target.id);
    const executor = targetAndExecutor.get(auditLogEntry.executor.id);

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
      user: [auditLogEntry.target.id, auditLogEntry.executor.id],
    })) as Collection<string, FireMember>;
    const target = targetAndExecutor.get(auditLogEntry.target.id);
    const executor = targetAndExecutor.get(auditLogEntry.executor.id);

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
}
