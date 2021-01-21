import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";

export default class GuildUnavailable extends Listener {
  constructor() {
    super("guildUnavailable", {
      emitter: "client",
      event: "guildUnavailable",
    });
  }

  async exec(guild: FireGuild) {
    this.client.console.warn(
      `[Guilds] Guild ${guild.name} (${guild.id}) has gone unavailable`
    );
    this.client.sentry.captureEvent({
      message: `Guild ${guild.name} (${guild.id}) has gone unavailable`,
      tags: {
        channelCount: guild.channels.cache.size,
        maxPresences: guild.maximumPresences,
        roleCount: guild.roles.cache.size,
        maxMembers: guild.maximumMembers,
        memberCount: guild.memberCount,
        shard: guild.shardID,
      },
    });
  }
}
