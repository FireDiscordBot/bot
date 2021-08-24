import { Payload } from "@fire/lib/interfaces/aether";
import { Manager } from "@fire/lib/Manager";
import { EventType } from "../util/constants";
import { EventStore } from "./EventStore";

export class EventHandler {
  manager: Manager;
  store: EventStore;

  constructor(manager: Manager) {
    this.manager = manager;
    this.store = new EventStore(manager);
  }

  async handle(message: Payload) {
    if (typeof message.s == "number") this.manager.seq = message.s;
    const event = this.store.get(message.op);

    if (event === null) {
      throw new TypeError(`Event type "${message.op}" not found!`);
    }

    if (typeof event?.run == "function")
      event
        ?.run(message.d, message.n)
        .catch((e) =>
          this.manager.client.console.error(
            `[EventHandler] Failed to handle event ${
              EventType[message.t]
            } due to\n${e.stack}`
          )
        );
  }
}
