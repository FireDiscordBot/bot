import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { Manager } from "@fire/lib/Manager";
import { EventStore } from "./EventStore";

export class EventHandler {
  manager: Manager;
  store: EventStore;

  constructor(manager: Manager) {
    this.manager = manager;
    this.store = new EventStore(manager);
  }

  async handle(message: any) {
    const decoded = MessageUtil.decode(message);
    if (!decoded) return;

    if (typeof decoded.s == "number") this.manager.seq = decoded.s;
    const event = this.store.get(decoded.op);

    if (event === null) {
      throw new TypeError(`Event type "${decoded.op}" not found!`);
    }

    event.run(decoded.d);
  }
}
