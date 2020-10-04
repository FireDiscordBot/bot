import { EventStore } from "./EventStore";
import { MessageUtil } from "../util/MessageUtil";
import { Manager } from "../../Manager";

export class EventHandler {
  manager: Manager;
  store: EventStore;

  constructor(manager: Manager) {
    this.manager = manager;
    this.store = new EventStore(manager);
  }

  init() {
    this.store.init();
  }

  handle(message: any) {
    const decoded = MessageUtil.decode(message);
    const event = this.store.get(decoded.type);

    if (event === null) {
      throw new TypeError(`Event type "${decoded.type}" not found!`);
    }

    event.run(decoded.data);
  }
}
