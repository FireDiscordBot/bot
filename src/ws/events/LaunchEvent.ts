import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  run(data: { id: number; shardCount: number; shards: number[] }) {
    this.manager.client.console.log(
      `[Aether] Received launch event with cluster id ${data.id}.`
    );
    this.manager.launch(data || { id: 0, shardCount: 1, shards: [0] });
  }
}
