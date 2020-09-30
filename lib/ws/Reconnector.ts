import { states } from "./util/constants";
import { Websocket } from "./Websocket";
import { Manager } from "../Manager";
const { IDLE, RECONNECTING } = states;

export class Reconnector {
  client: Manager;
  timeout: number;
  state: number;
  interval: NodeJS.Timeout | null;

  constructor(client: Manager, timeout = 5000) {
    this.client = client;
    this.timeout = timeout;
    this.state = IDLE;
    this.interval = null;
  }

  handleOpen() {
    if (this.state === RECONNECTING) {
      if (this.interval) clearInterval(this.interval);
      this.client.client.console.log("[Aether] Reconnected to Websocket.");
      this.state = IDLE;
    } else {
      this.client.client.console.log("[Aether] Connected to Websocket.");
    }
  }

  handleClose(code: number, reason: string) {
    if (this.state === IDLE) {
      this.client.client.console.warn(
        `[Aether] Disconnected from Websocket with code ${code} and reason ${reason}.`
      );
      this.activate();
    }
  }

  handleError(error: any) {
    if (error.code === "ECONNREFUSED") {
      if (this.state === IDLE) {
        this.activate();
      }
    } else {
      this.client.client.console.error(
        `[Aether] Received error event: ${error}`
      );
    }
  }

  activate() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.reconnect();
    }, this.timeout);
  }

  reconnect() {
    this.client.client.console.log(
      `[Aether] Attempting to reconnect with ${this.timeout}ms timeout.`
    );
    this.state = RECONNECTING;
    this.client.ws = new Websocket(this.client);
    this.client.init(true);
  }
}
