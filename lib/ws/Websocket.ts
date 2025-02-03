import { Manager } from "@fire/lib/Manager";
import { Collection } from "discord.js";
import * as Client from "ws";
import { Message } from "./Message";
import { MessageUtil } from "./util/MessageUtil";
import { EventType } from "./util/constants";

export class Websocket extends Client {
  handlers: Collection<string, (value: unknown, nonce: string) => void>;
  heartbeatTask: NodeJS.Timeout;
  keepAlive: NodeJS.Timeout;
  heartbeatInterval: number;
  clientSideClose: boolean;
  subscribed: string[];
  manager: Manager;
  lastPing: Date;

  constructor(manager: Manager) {
    const headers = {
      authorization: process.env.WS_AUTH,
      "x-aether-encoding": "zlib",
      "User-Agent": manager.ua,
    };
    if (manager.seq) headers["x-aether-seq"] = manager.seq;
    if (manager.session) headers["x-aether-session"] = manager.session;
    super(
      process.env.WS_HOST
        ? `wss://${process.env.WS_HOST}`
        : `ws://127.0.0.1:${process.env.WS_PORT}`,
      { headers }
    );
    this.handlers = new Collection();
    this.manager = manager;
    this.subscribed = [];
    this.once("open", () => {
      delete this.clientSideClose;
      this.manager.client.getModule("aetherstats").init();
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
      if (!this.open) {
        this.manager.client?.console?.warn(
          `[Aether] Received message on non-open socket, closing to initiate reconnect.`
        );
        return this.close(1006, "Received message on non-open socket");
      }

      const decoded = MessageUtil.decode(message.toString());
      if (!decoded) return;

      if (typeof decoded.s == "number") this.manager.seq = decoded.s;

      if (decoded.n && this.handlers.has(decoded.n)) {
        this.handlers.get(decoded.n)(decoded.d, decoded.n);
        this.handlers.delete(decoded.n);
      }

      this.manager.eventHandler.handle(decoded).catch((e) => {
        this.manager.sentry.captureException(e);
        this.manager.client?.console.error(
          `[EventHandler] Failed to handle event from Aether due to\n${e.stack}`
        );
      });
    });
  }

  startHeartbeat() {
    this.manager.client?.console?.log(
      `[Aether] Starting heartbeat with interval ${this.heartbeatInterval}ms`
    );
    if (this.keepAlive) clearTimeout(this.keepAlive);
    if (this.heartbeatTask) clearInterval(this.heartbeatTask);
    this.heartbeatTask = setInterval(() => {
      clearTimeout(this.keepAlive);
      this.keepAlive = setTimeout(() => {
        this.close(4004, "Did not receive heartbeat ack within interval");
      }, this.heartbeatInterval);
      this.send(
        MessageUtil.encode(
          new Message(
            EventType.HEARTBEAT,
            this.manager.seq ?? null,
            "HEARTBEAT_TASK"
          )
        )
      );
    }, this.heartbeatInterval);
  }

  close(code?: number, data?: string | Buffer) {
    // Stop heartbeat keep alive timeout and task interval
    clearTimeout(this.keepAlive), clearInterval(this.heartbeatTask);
    delete this.keepAlive, delete this.heartbeatTask;

    // This can be called multiple times per closure
    // so we only want to set it based on the first call
    // as it will be undefined at first
    if (typeof this.clientSideClose == "undefined")
      this.clientSideClose = !new Error().stack.includes(
        "Receiver.receiverOnConclude"
      );

    // We can then run the normal close method
    super.close(code, data);
  }

  get open() {
    return this.readyState == this.OPEN;
  }
}
