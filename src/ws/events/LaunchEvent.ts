import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  run(data: {
    shardCount: number;
    shards: number[];
    socketStats?: { [key: string]: number };
  }) {
    this.manager.client.console.log("[Aether] Received launch event.");
    if (data.socketStats) {
      const socketStats = new Map<string, number>();
      Object.keys(data.socketStats).forEach((event) => {
        socketStats.set(event, data.socketStats[event]);
      });
      this.manager.socketStats = socketStats;
    }
    this.manager.launch(data || { shardCount: 1, shards: [0] });
  }
}
