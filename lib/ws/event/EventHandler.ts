import { Manager } from "@fire/lib/Manager";
import { Payload } from "@fire/lib/interfaces/aether";
import { EventStore } from "./EventStore";

export class EventHandler {
  manager: Manager;
  store: EventStore;

  constructor(manager: Manager) {
    this.manager = manager;
    this.store = new EventStore(manager);
  }

  async handle(message: Payload) {
    const event = this.store.get(message.op);

    if (event === null) {
      throw new TypeError(
        `Event type "${message.t}" (${message.op}) not found!`
      );
    }

    if (typeof event?.run == "function")
      event?.run(message.d, message.n).catch((e) => {
        this.manager.sentry?.captureException(e, {
          extra: {
            event: message.t,
            nonce: message.n,
          },
        });
        this.manager
          .getLogger("Aether")
          .error(
            `[EventHandler] Failed to handle event ${message.t} (${message.op}) due to\n${e.stack}`
          );
      });
  }
}
