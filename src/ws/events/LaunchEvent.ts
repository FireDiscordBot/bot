import { Event } from "../../../lib/ws/event/Event";
import { EventType } from "../../../lib/ws/util/constants";
import { Manager } from "../../../lib/Manager";

export default class LaunchEvent extends Event {
  constructor(client: Manager) {
    super(client, EventType.LAUNCH_CLIENT);
  }

  run(data: { shardCount?: number; shards?: number[] }) {
    this.client.client.console.log("[Aether] Received launch event.");
    this.client.launch(data || { shardCount: 1, shards: [0] });
  }
}
