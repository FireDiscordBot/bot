import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  run(data: {
    events: { [event: string]: number };
    shardCount: number;
    shards: number[];
    session: string;
    id: number;
  }) {
    this.manager.client.console.log(
      `[Aether] Received launch event with cluster id ${data.id}.`
    );
    if (data.events) this.manager.client.events = data.events;
    this.manager.launch(
      data || { id: 0, session: "", shardCount: 1, shards: [0] }
    );
  }
}
