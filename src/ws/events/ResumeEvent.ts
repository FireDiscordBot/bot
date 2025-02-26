import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";

export default class Resume extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESUME_CLIENT);
  }

  async run(data: { replayed: number; interval: number }) {
    this.manager.ready = true;
    this.console.log(
      data.replayed
        ? `Sucessfully resumed session ${this.manager.session} with ${data.replayed} replayed events.`
        : `Sucessfully resumed session ${this.manager.session}.`
    );
    this.manager.ws.heartbeatInterval = data.interval;
    this.manager.ws.startHeartbeat();

    let item: ReturnType<Manager["influxQueue"]["shift"]>;
    if (this.manager.influxQueue.length) {
      while ((item = this.manager.influxQueue.shift()))
        this.manager.writeToInflux(item.points, item.options);
    }
  }
}
