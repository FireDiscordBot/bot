import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class RestartEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESTART_CLIENT);
  }

  run(data: { shardCount: number; shards: number[] }) {
    this.manager.client.console.log(
      "[Aether] Received restart event, relaunching client."
    );
    const currentOptions = this.manager.client.options;
    if (
      currentOptions.shardCount == data.shardCount &&
      currentOptions.shards == data.shards
    )
      return;
    this.manager.relaunch(data || { shardCount: 1, shards: [0] });
  }
}
