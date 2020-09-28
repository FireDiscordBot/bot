import * as Client from "ws";
import { Manager } from "../Manager";
import { EventHandler } from "./event/EventHandler";
import { MessageUtil } from "./util/MessageUtil";
import { Message } from "./Message";
import { EventType } from "./util/constants";

export class Websocket extends Client {
  client: Manager;
  handler: EventHandler;

  constructor(client: Manager) {
    super(process.env.WS_URL);
    this.client = client;
    this.handler = new EventHandler(client);
    this.on("open", () => {
      this.send(
        MessageUtil.encode(
          new Message(EventType.IDENTIFY_CLIENT, {
            id: this.client.id,
            ready: !!this.client.client.readyAt,
          })
        )
      );
      this.client.client.console.log("[Aether] Sending identify event.");
    });
  }

  init() {
    this.handler.init();

    this.on("message", (message) => {
      this.handler.handle(message);
    });
  }
}
