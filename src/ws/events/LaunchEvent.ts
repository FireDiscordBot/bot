import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  run(data: { shardCount: number; shards: number[] }) {
    this.manager.client.console.log("[Aether] Received launch event.");
    this.manager.launch(data || { shardCount: 1, shards: [0] });
  }
}
