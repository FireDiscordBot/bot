import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";

export default class GuildDelete extends Listener {
  constructor() {
    super("guildDelete", {
      emitter: "client",
      event: "guildDelete",
    });
  }

  async exec(guild: FireGuild) {
    if (!this.client.readyAt) return;
    const owner = (await this.client.users
      .fetch(guild.ownerId, {
        cache: false,
      })
      .catch(() => {})) as FireUser;
    guild.console.log(
      `Fire left ${guild.name} with ${guild.memberCount} members, owned by ${
        owner ?? "an unknown user"
      } (${guild.ownerId})`
    );

    if (this.client.manager.ws?.open)
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.REMOVE,
            guilds: [{ id: guild.id }],
          })
        )
      );
  }
}
