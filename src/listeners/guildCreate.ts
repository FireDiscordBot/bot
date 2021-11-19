import { FireGuild } from "@fire/lib/extensions/guild";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { Listener } from "@fire/lib/util/listener";
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
    if (!this.client.guildSettings.items.has(guild.id))
      await this.client.guildSettings.init(guild.id);

    this.client.console.log(
      `[Guilds] Fire joined a new guild! ${guild.name} (${guild.id}) with ${guild.memberCount} members`
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
