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
        this.manager.session && typeof this.manager.seq == "number"
          ? MessageUtil.encode(
              new Message(EventType.IDENTIFY_CLIENT, {
                ready: !!this.manager.client.readyAt,
                sessionId: this.manager.session,
                seq: this.manager.seq,
                pid: process.pid,
                config: {},
              })
            )
          : MessageUtil.encode(
              new Message(EventType.IDENTIFY_CLIENT, {
                ready: !!this.manager.client.readyAt,
                pid: process.pid,
                config: {},
              })
            )
      );
      if (!this.manager.seq) this.manager.seq = 0;
    });
  }

  init() {
    this.on("message", (message) => {
      this.manager.eventHandler.handle(message).catch((e) => {
        this.manager.client?.console.error(
          `[EventHandler] Failed to handle event from aether due to\n${e.stack}`
        );
      });
    });
  }

  get open() {
    return this.readyState == this.OPEN;
  }
}
