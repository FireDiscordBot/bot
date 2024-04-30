import { FireGuild } from "@fire/lib/extensions/guild";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { ActionLogTypes, titleCase } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import {
  DMChannel,
  GuildChannel,
  MessageEmbed,
  Permissions,
  Snowflake,
} from "discord.js";

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

    if (guild.ticketIds.includes(channel.id)) {
      const newTickets = guild.ticketIds.filter((c) => c != channel.id);
      if (newTickets.length) guild.settings.set("tickets.channels", newTickets);
      else guild.settings.delete("tickets.channels");

      if (!channel.parent?.children.size) {
        const category = channel.parent;
        const isOriginal =
          guild.settings
            .get<Snowflake[]>("tickets.parent", [])
            ?.indexOf(category.id) == 0;
        if (!isOriginal)
          await channel.parent
            .delete(guild.language.get("TICKET_OVERFLOW_DELETE_REASON"))
            .then(() => {
              const oldParents = guild.settings.get<Snowflake[]>(
                "tickets.parent",
                []
              );
              guild.settings.set(
                "tickets.parent",
                oldParents.filter((id) => id != category.id)
              );
            })
            .catch(() => {});
      }
    } else if (
      guild.settings
        .get<Snowflake[]>("tickets.parent", [])
        ?.includes(channel.id)
    ) {
      let parents = guild.settings.get<Snowflake[]>("tickets.parent", []);
      parents = parents.filter((c) => c != channel.id);
      if (parents.length) guild.settings.set("tickets.parent", parents);
      else guild.settings.delete("tickets.parent");
    }

    if (guild.settings.has("log.action")) {
      const data = {
        ...channel,
        permissionOverwrites: channel.permissionOverwrites.cache.toJSON(),
      };
      delete data.client;
      delete data.guild;
      // @ts-ignore
      delete data._typing;
      let raw: string | void;
      try {
        raw = await this.client.util
          .haste(JSON.stringify(data, null, 4))
          .catch(() => {});
      } catch {}
      const embed = new MessageEmbed()
        .setColor("#E74C3C")
        .setTimestamp()
        .setAuthor({
          name: language.get("CHANNELDELETELOG_AUTHOR", {
            type: titleCase(channel.type.replace(/_/g, " ")),
            guild: guild.name,
          }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .addField(language.get("NAME"), channel.name)
        .setFooter(channel.id);
      if (channel instanceof FireTextChannel && channel.topic)
        embed.addField(language.get("TOPIC"), channel.topic);
      if (channel instanceof FireTextChannel && channel.rateLimitPerUser)
        embed.addField(
          language.get("SLOWMODE"),
          `${channel.rateLimitPerUser} seconds`
        );
      if (channel.permissionOverwrites.cache.size > 1) {
        const canView = channel.permissionOverwrites.cache
          .filter((overwrite) =>
            overwrite.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
          )
          .map((overwrite) => overwrite.id);
        const roles = [
          ...canView
            .map((id) => guild.roles.cache.get(id))
            .filter((role) => !!role),
          ...guild.roles.cache
            .filter(
              (role) =>
                role.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
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
        embed.addField(language.get("VIEWABLE_BY"), `${viewers.join(" - ")}`);
      }
      if (guild.members.me.permissions.has(Permissions.FLAGS.VIEW_AUDIT_LOG)) {
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
      await guild
        .actionLog(embed, ActionLogTypes.CHANNEL_DELETE)
        .catch(() => {});
    }
  }
}
