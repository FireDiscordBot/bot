import {
  TextBasedChannel,
  GuildChannel,
  MessageEmbed,
  TextChannel,
  DMChannel,
} from "discord.js";
import { FireGuild } from "../../lib/extensions/guild";
import { humanize } from "../../lib/util/constants";
import { Listener } from "../../lib/util/listener";

export default class ChannelDelete extends Listener {
  constructor() {
    super("channelDelete", {
      emitter: "client",
      event: "channelDelete",
    });
  }

  async exec(channel: GuildChannel | DMChannel) {
    if (channel instanceof DMChannel) return;
    const guild = channel.guild as FireGuild,
      language = guild.language;

    if (guild.settings.has("log.action")) {
      const data = {
        ...channel,
        permissionOverwrites: channel.permissionOverwrites.toJSON(),
        messages: null,
      };
      if (channel.hasOwnProperty("messages"))
        // @ts-ignore
        data.messages = channel.messages?.cache;
      delete data.client;
      delete data.guild;
      // @ts-ignore
      delete data._typing;
      const raw = await this.client.util
        .haste(JSON.stringify(data, null, 4))
        .catch(() => {});
      const embed = new MessageEmbed()
        .setColor("#E74C3C")
        .setTimestamp()
        .setAuthor(
          language.get("CHANNELDELETELOG_AUTHOR", channel.type, guild.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("NAME"), channel.name)
        .setFooter(channel.id);
      if (channel instanceof TextChannel && channel.topic)
        embed.addField(language.get("TOPIC"), channel.topic);
      if (channel instanceof TextChannel && channel.rateLimitPerUser)
        embed.addField(
          language.get("SLOWMODE"),
          humanize(channel.rateLimitPerUser, language.id.split("-")[0])
        );
      if (channel.permissionOverwrites.size > 1) {
        const canView = channel.permissionOverwrites
          .filter((overwrite) => overwrite.allow.has("VIEW_CHANNEL"))
          .map((overwrite) => overwrite.id);
        const roles = [
          ...canView
            .map((id) => guild.roles.cache.get(id))
            .filter((role) => !!role),
          ...guild.roles.cache
            .filter(
              (role) =>
                role.permissions.has("ADMINISTRATOR") &&
                !canView.find((id) => id == role.id)
            )
            .values(),
        ];
        const memberIds = canView.filter(
          (id) => !roles.find((role) => role.id == id)
        );
        // owner can always see
        memberIds.push(guild.ownerID);
        const members: string[] = memberIds.length
          ? await guild.members
              .fetch({ user: memberIds })
              .then((found) => found.map((member) => member.toString()))
              .catch(() => [])
          : [];
        const viewers = [...roles.map((role) => role.toString()), ...members];
        embed.addField(language.get("VIEWABLE_BY"), `${viewers.join(" - ")}`);
      }
      if (guild.me.permissions.has("VIEW_AUDIT_LOG")) {
        const auditLogActions = await guild
          .fetchAuditLogs({ limit: 2, type: "CHANNEL_DELETE" })
          .catch(() => {});
        if (auditLogActions) {
          const action = auditLogActions.entries.find(
            (entry) =>
              // @ts-ignore
              entry.targetType == "CHANNEL" && entry.target?.id == channel.id
          );
          if (action) {
            embed.addField(
              language.get("DELETED_BY"),
              `${action.executor} (${action.executor.id})`
            );
            if (action.reason)
              embed.addField(language.get("REASON"), action.reason);
          }
        }
      }
      if (raw) embed.addField(language.get("RAW"), raw);
      await guild.actionLog(embed, "channel_delete").catch(() => {});
    }
  }
}
