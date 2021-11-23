import { ThreadChannel, MessageEmbed, Formatters } from "discord.js";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";

export default class ThreadDelete extends Listener {
  constructor() {
    super("threadDelete", {
      emitter: "client",
      event: "threadDelete",
    });
  }

  async exec(thread: ThreadChannel) {
    const guild = thread.guild as FireGuild,
      language = guild.language;

    if (guild.ticketIds.includes(thread.id)) {
      const newTickets = guild.ticketIds.filter((c) => c != thread.id);
      if (newTickets.length) guild.settings.set("tickets.channels", newTickets);
      else guild.settings.delete("tickets.channels");
    }

    if (guild.settings.has("log.action")) {
      const owner = await guild.members.fetch(thread.ownerId).catch(() => {});
      const autoArchiveDuration =
        typeof thread.autoArchiveDuration == "string"
          ? 10080
          : thread.autoArchiveDuration;
      const autoArchiveAt = new Date(+new Date() + autoArchiveDuration * 60000);
      const data = {
        ...thread,
      };
      delete data.client;
      delete data.guild;
      let raw: string | void;
      try {
        raw = await this.client.util
          .haste(JSON.stringify(data, null, 4))
          .catch(() => {});
      } catch {}
      const embed = new MessageEmbed()
        .setColor("#E74C3C")
        .setTimestamp()
        .setAuthor(
          language.get("THREADDELETELOG_AUTHOR", { guild: guild.name }),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("NAME"), thread.name)
        .addField(language.get("CHANNEL"), thread.parent?.toString() ?? "¯\\\\_(ツ)_/¯")
        .addField(
          language.get("ARCHIVE"),
          Formatters.time(autoArchiveAt, "R")
        )
        .addField(
          language.get("CREATED_BY"),
          owner ? `${owner} (${owner.id})` : thread.ownerId
        )
        .setFooter(thread.id);
      // if (channel.permissionOverwrites.size > 1) {
      //   const canView = channel.permissionOverwrites
      //     .filter((overwrite) =>
      //       overwrite.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      //     )
      //     .map((overwrite) => overwrite.id);
      //   const roles = [
      //     ...canView
      //       .map((id) => guild.roles.cache.get(id))
      //       .filter((role) => !!role),
      //     ...guild.roles.cache
      //       .filter(
      //         (role) =>
      //           role.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
      //           !canView.find((id) => id == role.id)
      //       )
      //       .values(),
      //   ];
      //   const memberIds = canView.filter(
      //     (id) => !roles.find((role) => role.id == id)
      //   );
      //   // owner can always see
      //   memberIds.push(guild.ownerId);
      //   const members: string[] = memberIds.length
      //     ? await guild.members
      //         .fetch({ user: memberIds })
      //         .then((found) => found.map((member) => member.toString()))
      //         .catch(() => [])
      //     : [];
      //   const viewers = [...roles.map((role) => role.toString()), ...members];
      //   embed.addField(language.get("VIEWABLE_BY"), `${viewers.join(" - ")}`);
      // }

      // there doesn't seem to be an audit log event for deleting threads
      // if (guild.me.permissions.has(Permissions.FLAGS.VIEW_AUDIT_LOG)) {
      //   const auditLogActions = await guild
      //     .fetchAuditLogs({ limit: 2, type: "CHANNEL_DELETE" })
      //     .catch(() => {});
      //   if (auditLogActions) {
      //     const action = auditLogActions.entries.find(
      //       (entry) =>
      //         // @ts-ignore
      //         entry.targetType == "CHANNEL" && entry.target?.id == channel.id
      //     );
      //     if (action) {
      //       embed.addField(
      //         language.get("DELETED_BY"),
      //         `${action.executor} (${action.executor.id})`
      //       );
      //       if (action.reason)
      //         embed.addField(language.get("REASON"), action.reason);
      //     }
      //   }
      // }
      if (raw) embed.addField(language.get("RAW"), raw);
      await guild.actionLog(embed, "channel_delete").catch(() => {});
    }
  }
}
