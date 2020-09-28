import { Event } from "../../../lib/ws/event/Event";
import { EventType } from "../../../lib/ws/util/constants";
import { Manager } from "../../../lib/Manager";

export class LaunchEvent extends Event {
  constructor(client: Manager) {
    super(client, EventType.LAUNCH_CLIENT);
  }

  run(data: any) {
    this.manager.client.console.log("[Aether] Received launch event.");
    this.manager.launch(data);
  }
}
