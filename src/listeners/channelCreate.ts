import { GuildChannel, MessageEmbed, Permissions, DMChannel } from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireGuild } from "@fire/lib/extensions/guild";
import { humanize } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";

export default class ChannelCreate extends Listener {
  constructor() {
    super("channelCreate", {
      emitter: "client",
      event: "channelCreate",
    });
  }

  async exec(channel: GuildChannel | DMChannel) {
    if (channel instanceof DMChannel) return;
    const guild = channel.guild as FireGuild,
      language = guild.language;
    const muteRole = guild.muteRole;
    let muteFail = false;
    if (muteRole)
      await channel
        .updateOverwrite(
          muteRole,
          {
            USE_PRIVATE_THREADS: false,
            USE_PUBLIC_THREADS: false,
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
            SPEAK: false,
          },
          {
            reason: guild.language.get("MUTE_ROLE_CREATE_REASON"),
            type: 0,
          }
        )
        .catch(() => (muteFail = true));

    if (guild.permRoles.size) {
      for (const [role, perms] of guild.permRoles) {
        if (
          !channel.permissionsFor(guild.me).has(Permissions.FLAGS.MANAGE_ROLES)
        )
          continue;
        await channel
          .overwritePermissions(
            [
              ...channel.permissionOverwrites.array().filter(
                // ensure the overwrites below are used instead
                (overwrite) => overwrite.id != role
              ),
              {
                allow: perms.allow,
                deny: perms.deny,
                id: role,
                type: "role",
              },
            ],
            guild.language.get("PERMROLES_REASON")
          )
          .catch(() => {});
      }
    }

    if (guild.settings.has("log.action")) {
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(channel.createdAt)
        .setAuthor(
          language.get("CHANNELCREATELOG_AUTHOR", channel.type, guild.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("NAME"), channel.name);
      if (channel instanceof FireTextChannel && channel.topic)
        embed.addField(language.get("TOPIC"), channel.topic);
      if (channel instanceof FireTextChannel && channel.rateLimitPerUser)
        embed.addField(
          language.get("SLOWMODE"),
          humanize(channel.rateLimitPerUser, language.id.split("-")[0])
        );
      if (muteFail)
        embed.addField(
          language.get("WARNING"),
          language.get("CHANNELCREATELOG_MUTE_PERMS_FAIL")
        );
      if (channel.permissionOverwrites.size > 1) {
        const canView = channel.permissionOverwrites
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
      if (guild.me.permissions.has(Permissions.FLAGS.VIEW_AUDIT_LOG)) {
        const auditLogActions = await guild
          .fetchAuditLogs({ limit: 2, type: "CHANNEL_CREATE" })
          .catch(() => {});
        if (auditLogActions) {
          const action = auditLogActions.entries.find(
            (entry) =>
              // @ts-ignore
              entry.targetType == "CHANNEL" && entry.target?.id == channel.id
          );
          if (action)
            embed.addField(
              language.get("CREATED_BY"),
              `${action.executor} (${action.executor.id})`
            );
        }
      }
      await guild.actionLog(embed, "channel_create").catch(() => {});
    }
  }
}
