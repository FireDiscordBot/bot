import { ManagerState } from "@fire/lib/interfaces/aether";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import AetherStats from "@fire/src/modules/aetherstats";

type EventData = Record<string, Record<string, number>>;

export default class Launch extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  async run(data: {
    state: ManagerState;
    shardCount: number;
    events: EventData;
    shards: number[];
    interval: number;
    session: string;
    id: number;
  }) {
    this.manager
      .getLogger("Aether")
      .log(`Received launch event with cluster id ${data.id}.`);
    this.manager.state = data.state;
    this.manager.ws.heartbeatInterval = data.interval;
    this.manager.ws.startHeartbeat();
    const aetherstats = this.manager.client.getModule(
      "aetherstats"
    ) as AetherStats;
    if (aetherstats) aetherstats.events = data.events;
    this.manager.launch(
      data || { id: 0, session: "", shardCount: 1, shards: [0] }
    );

    let item: ReturnType<Manager["influxQueue"]["shift"]>;
    if (this.manager.influxQueue.length) {
      while ((item = this.manager.influxQueue.shift()))
        this.manager.writeToInflux(item.points, item.options);
    }
  }
}
