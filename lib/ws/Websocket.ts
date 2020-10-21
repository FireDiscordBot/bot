import * as Client from "ws";
import { Manager } from "../Manager";
import { EventHandler } from "./event/EventHandler";
import { MessageUtil } from "./util/MessageUtil";
import { Message } from "./Message";
import { EventType } from "./util/constants";

export class Websocket extends Client {
  manager: Manager;
  handler: EventHandler;

  constructor(manager: Manager) {
    super(
      process.env.NODE_ENV == "development"
        ? `ws://127.0.0.1:${process.env.WS_PORT}`
        : `wss://${process.env.WS_HOST}`
    );
    this.manager = manager;
    this.handler = new EventHandler(manager);
    this.on("open", () => {
      this.send(
        MessageUtil.encode(
          new Message(EventType.IDENTIFY_CLIENT, {
            id: manager.id,
            ready: !!manager.client.readyAt,
            config: {
              restPort: parseInt(process.env.REST_START_PORT) + manager.id,
            },
          })
        )
      );
      manager.client.console.log("[Aether] Sending identify event.");
    });
  }

  init() {
    this.handler.init();

    this.on("message", (message) => {
      this.handler.handle(message);
    });
  }
}
