import { Manager } from "@fire/lib/Manager";
import { Collection } from "discord.js";
import * as Client from "ws";
import { Message } from "./Message";
import { EventType } from "./util/constants";
import { MessageUtil } from "./util/MessageUtil";

export class Websocket extends Client {
  handlers: Collection<string, (value: unknown) => void>;
  clientSideClose: boolean;
  heartbeatInterval: number;
  keepAlive: NodeJS.Timeout;
  subscribed: string[];
  manager: Manager;
  seq: number;

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
    this.seq = 0;
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

      this.seq = decoded.s;

      if (decoded.n && this.handlers.has(decoded.n)) {
        this.handlers.get(decoded.n)(decoded.d);
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
    if (this.keepAlive) {
      clearTimeout(this.keepAlive);
      delete this.keepAlive;
    }
    this.keepAlive = setTimeout(() => {
      this.close(4004, "Did not receive heartbeat ack");
    }, this.heartbeatInterval + 10000);
    setTimeout(() => {
      clearTimeout(this.keepAlive);
      this.keepAlive = setTimeout(() => {
        this.close(4004, "Did not receive heartbeat ack");
      }, this.heartbeatInterval / 2);
      this.send(
        MessageUtil.encode(
          new Message(EventType.HEARTBEAT, this.seq || null, "HEARTBEAT_TASK")
        )
      );
      setInterval(() => {
        clearTimeout(this.keepAlive);
        this.keepAlive = setTimeout(() => {
          this.close(4004, "Did not receive heartbeat ack");
        }, this.heartbeatInterval / 2);
        this.send(
          MessageUtil.encode(
            new Message(EventType.HEARTBEAT, this.seq || null, "HEARTBEAT_TASK")
          )
        );
      }, this.heartbeatInterval);
    }, this.heartbeatInterval * Math.random());
  }

  close(code?: number, data?: string | Buffer) {
    this.clientSideClose = true;
    super.close(code, data);
  }

  get open() {
    return this.readyState == this.OPEN;
  }
}
