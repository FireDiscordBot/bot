import { FireGuild } from "@fire/lib/extensions/guild";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { Listener } from "@fire/lib/util/listener";
import { GuildSettings } from "@fire/lib/util/settings";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";

export default class GuildCreate extends Listener {
  constructor() {
    super("guildCreate", {
      emitter: "client",
      event: "guildCreate",
    });
  }

  async exec(guild: FireGuild) {
    const loadedConfig = await GuildSettings.retrieve(guild, this.client);
    if (!loadedConfig) {
      this.client.console.error(
        `[Guilds] Failed to load config for guild ${guild.name} (${guild.id})`
      );
      // Send to sentry too so it gets noticed
      this.client.sentry.captureEvent({
        message: `Failed to load config for guild ${guild.name} (${guild.id})`,
      });
    }

    // if we have any config keys, it's not a new guild we've joined
    // but if we have none, it may not be a new guild but is more likely to be
    const hasKeys = Object.keys(
      this.client.manager.state.guildConfigs[guild.id] ?? {}
    ).length;

    this.client.console.log(
      `[Guilds] Fire ${hasKeys ? "re" : ""}joined a ${
        hasKeys ? "" : "new "
      }guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members`
    );

    if (guild.isPublic() && this.client.manager.ws?.open)
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.ADD,
            guilds: [guild.getDiscoverableData()],
          })
        )
      );
  }
}
