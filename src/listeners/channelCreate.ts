import { GuildChannel, MessageEmbed, TextChannel, DMChannel } from "discord.js";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";

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
    if (muteRole && channel instanceof TextChannel)
      await channel
        .updateOverwrite(
          muteRole,
          {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
          },
          guild.language.get("MUTE_ROLE_CREATE_REASON") as string
        )
        .catch(() => (muteFail = true));

    if (guild.settings.has("temp.log.action")) {
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(channel.createdAt)
        .setAuthor(
          language.get("CHANNELCREATELOG_AUTHOR", channel.type, guild.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("NAME"), channel.name);
      if (channel instanceof TextChannel && channel.topic)
        embed.addField(language.get("TOPIC"), channel.topic);
      if (muteFail)
        embed.addField(
          language.get("WARNING"),
          language.get("CHANNELCREATELOG_MUTE_PERMS_FAIL")
        );
      if (guild.me.permissions.has("VIEW_AUDIT_LOG")) {
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
