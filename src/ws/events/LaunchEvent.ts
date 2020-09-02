import { Event } from "../../../lib/ws/event/Event";
import { types } from "../../../lib/ws/util/constants";
import { Manager } from "../../../lib/Manager";

export class LaunchEvent extends Event {
  constructor(client: Manager) {
    super(client, types.LAUNCH_CLIENT);
  }

  run(data) {
    this.client.client.console.log("[Aether] Received launch event.");
    this.client.launch(data);
  }
}
