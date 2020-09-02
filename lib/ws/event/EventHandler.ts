import { Fire } from "../../Fire";
import { EventStore } from "./EventStore";
import { MessageUtil } from "../util/MessageUtil";

export class EventHandler {
  client: Fire;
  store: EventStore;

  constructor(client: Fire) {
    this.client = client;
    this.store = new EventStore(client);
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
