import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.REPLACE_CLIENT);
  }

  run(data: {
    isBeingReplaced?: boolean;
    shardCount?: number;
    shards?: { [shard: number]: { session: string; seq: number } };
  }) {
    if (data.isBeingReplaced) return this.manager.replace();
    this.manager.client.console.log("[Aether] Received replace event.");
    this.manager.launchReplacement(data.shardCount, data.shards);
  }
}
