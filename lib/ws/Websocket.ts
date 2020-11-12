import { EventHandler } from "./event/EventHandler";
import { MessageUtil } from "./util/MessageUtil";
import { EventType, WebsocketStates } from "./util/constants";
import { Reconnector } from "./Reconnector";
import { Manager } from "../Manager";
import { Message } from "./Message";
import * as Client from "ws";

export class Websocket extends Client {
  manager: Manager;
  handler: EventHandler;
  reconnector: Reconnector;
  keepAlive: NodeJS.Timeout;
  waitingForPong: boolean;

  constructor(manager: Manager) {
    super(
      process.env.NODE_ENV == "development"
        ? `ws://127.0.0.1:${process.env.WS_PORT}`
        : `wss://${process.env.WS_HOST}`,
      {
        headers: {
          "User-Agent": "Fire Discord Bot",
          authorization: process.env.WS_AUTH,
        },
      }
    );
    this.manager = manager;
    this.waitingForPong = false;
    this.handler = new EventHandler(manager);
    this.on("open", () => {
      this.keepAlive = setInterval(() => {
        if (this.waitingForPong) {
          this.reconnector.state = WebsocketStates.CLOSING;
          return this.close(4009, "Did not receive pong in time");
        }
        this.ping();
        this.waitingForPong = true;
      }, this.manager.client.config.aetherPingTimeout);
      this.manager.client.getModule("aetherstats").init();
      this.send(
        MessageUtil.encode(
          new Message(EventType.IDENTIFY_CLIENT, {
            id: manager.id,
            ready: !!manager.client.readyAt,
            config: {},
          })
        )
      );
      manager.client.console.log("[Aether] Sending identify event.");
    });
  }

  init() {
    this.manager.client.console.log("[Aether] Initializing websocket...");
    this.handler.init();

    this.on("message", (message) => {
      this.handler.handle(message);
    });
  }
}
