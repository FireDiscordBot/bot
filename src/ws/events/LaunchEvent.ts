import { ManagerState } from "@fire/lib/interfaces/aether";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

 async run(data: {
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
    this.manager.launch(
      data || { id: 0, session: "", shardCount: 1, shards: [0] }
    );
  }
}
