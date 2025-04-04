import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";

export default class GuildUnavailable extends Listener {
  unavailable: Set<string> = new Set();

  constructor() {
    super("guildUnavailable", {
      emitter: "client",
      event: "guildUnavailable",
    });
  }

  async exec(guild: FireGuild) {
    if (typeof guild.name == "undefined") return;
    if (this.unavailable.has(guild.id)) return;
    this.unavailable.add(guild.id);
    guild.console.warn(`${guild.name} has gone unavailable`);
    this.client.sentry.captureEvent({
      message: `Guild ${guild.name} (${guild.id}) has gone unavailable`,
      tags: {
        channelCount: guild.channels.cache.size,
        maxPresences: guild.maximumPresences,
        roleCount: guild.roles.cache.size,
        maxMembers: guild.maximumMembers,
        memberCount: guild.memberCount,
        shard: guild.shardId,
      },
    });
  }
}
