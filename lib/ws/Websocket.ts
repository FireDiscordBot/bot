import { EventType, WebsocketStates } from "./util/constants";
import { MessageUtil } from "./util/MessageUtil";
import { Manager } from "@fire/lib/Manager";
import { Collection } from "discord.js";
import { Message } from "./Message";
import * as Client from "ws";

export class Websocket extends Client {
  handlers: Collection<string, (value: unknown) => void>;
  keepAlive: NodeJS.Timeout;
  waitingForPong: boolean;
  subscribed: string[];
  manager: Manager;
  pongs: number;

  constructor(manager: Manager) {
    super(
      process.env.WS_HOST
        ? `wss://${process.env.WS_HOST}`
        : `ws://127.0.0.1:${process.env.WS_PORT}`,
      {
        headers: {
          "x-aether-seq": manager.seq?.toString() || "0",
          "x-aether-session": manager.session || "",
          authorization: process.env.WS_AUTH,
          "User-Agent": `Fire Discord Bot/${manager.version} (+https://fire.gaminggeek.dev/)`,
          "x-aether-encoding": "zlib",
        },
      }
    );
    this.handlers = new Collection();
    this.waitingForPong = false;
    this.manager = manager;
    this.subscribed = [];
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
      if (!this.manager.session)
        this.send(
          MessageUtil.encode(
            new Message(EventType.IDENTIFY_CLIENT, {
              ready: !!this.manager.client.readyAt,
              id: this.manager.id,
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
      const decoded = MessageUtil.decode(message.toString());
      if (!decoded) return;

      if (decoded.n && this.handlers.has(decoded.n)) {
        this.handlers.get(decoded.n)(decoded.d);
        this.handlers.delete(decoded.n);
      }

      this.manager.eventHandler.handle(decoded).catch((e) => {
        this.manager.client?.console.error(
          `[EventHandler] Failed to handle event from Aether due to\n${e.stack}`
        );
      });
    });
  }

  get open() {
    return this.readyState == this.OPEN;
  }
}
