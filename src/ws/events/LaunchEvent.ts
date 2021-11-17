import { Collection } from "@discordjs/collection";
import { ManagerState } from "@fire/lib/interfaces/aether";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import AetherStats from "@fire/src/modules/aetherstats";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  async run(data: {
    gatewayEvents: Record<number, Record<string, number>>;
    state: ManagerState;
    shardCount: number;
    shards: number[];
    session: string;
    id: number;
  }) {
    this.manager.client.console.log(
      `[Aether] Received launch event with cluster id ${data.id}.`
    );
    this.manager.state = data.state;
    const stats = this.manager.client.getModule("aetherstats") as AetherStats;
    if (stats)
      for (const [shard, events] of Object.entries(data.gatewayEvents)) {
        const shardId = parseInt(shard);
        stats.gatewayEvents.set(
          shardId,
          new Collection(Object.entries(events))
        );
        stats.sessionGatewayEvents.set(shardId, new Collection());
        for (const event of Object.keys(events))
          stats.sessionGatewayEvents.get(shardId).set(event, 0);
      }
    this.manager.launch(
      data || { id: 0, session: "", shardCount: 1, shards: [0] }
    );
  }
}
