import { IPoint, IWriteOptions } from "@fire/lib/interfaces/aether";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";

export default class ResumeEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESUME_CLIENT);
  }

  async run(data: { replayed: number }) {
    this.manager.ready = true;
    this.manager.client.console.log(
      data.replayed
        ? `[Aether] Sucessfully resumed session ${this.manager.session} with ${data.replayed} replayed events.`
        : `[Aether] Sucessfully resumed session ${this.manager.session}.`
    );

    let item: ReturnType<Manager["influxQueue"]["shift"]>;
    if (this.manager.influxQueue.length) {
      while ((item = this.manager.influxQueue.shift()))
        this.manager.writeToInflux(item.points, item.options);
    }
  }
}
