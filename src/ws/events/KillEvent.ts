import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";

export default class Kill extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.KILL_CLIENT);
  }

  async run(data: { reason?: string }) {
    this.console.log(
      data.reason
        ? `Received kill event with reason "${data.reason}", shutting down...`
        : "Received kill event, shutting down..."
    );
    this.manager.kill(data.reason ?? "forced_shutdown");
  }
}
