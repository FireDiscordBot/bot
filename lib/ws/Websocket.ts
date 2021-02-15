import { EventType, WebsocketStates } from "./util/constants";
import { MessageUtil } from "./util/MessageUtil";
import { Manager } from "@fire/lib/Manager";
import { Message } from "./Message";
import * as Client from "ws";

export class Websocket extends Client {
  keepAlive: NodeJS.Timeout;
  waitingForPong: boolean;
  manager: Manager;
  pongs: number;

  constructor(manager: Manager) {
    super(
      process.env.WS_HOST
        ? `wss://${process.env.WS_HOST}`
        : `ws://127.0.0.1:${process.env.WS_PORT}`,
      {
        headers: {
          "User-Agent": "Fire Discord Bot",
          authorization: process.env.WS_AUTH,
        },
      }
    );
    this.manager = manager;
    this.waitingForPong = false;
    this.pongs = 0;
    this.once("open", () => {
      this.keepAlive = setInterval(() => {
        if (this.waitingForPong) {
          this.manager.client.console.warn(
            `[Aether] Did not receive pong in time. Closing connection with ${this.pongs} pongs...`
          );
          this.manager.reconnector.state = WebsocketStates.CLOSING;
          return this.close(4009, "Did not receive pong in time");
        }
        this.waitingForPong = true;
        this.ping();
      }, this.manager.client.config.aetherPingTimeout);
      this.on("pong", () => {
        this.waitingForPong = false;
        this.pongs++;
      });
      this.manager.client.getModule("aetherstats").init();
      this.send(
        MessageUtil.encode(
          new Message(EventType.IDENTIFY_CLIENT, {
            pid: process.pid,
            ready: !!manager.client.readyAt,
            config: {},
          })
        )
      );
    });
  }

  init() {
    this.on("message", (message) => {
      this.manager.eventHandler.handle(message);
    });
  }

  get open() {
    return this.readyState == this.OPEN;
  }
}
