import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";

export default class HeartbeatAck extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.HEARTBEAT_ACK);
  }

  async run(_: null, __: "HEARTBEAT_TASK") {
    clearTimeout(this.manager.ws.keepAlive);
    this.manager.ws.lastPing = new Date();
  }
}
