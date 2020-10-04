import { WebsocketStates } from "./util/constants";
import { Websocket } from "./Websocket";
import { Manager } from "../Manager";

export class Reconnector {
  manager: Manager;
  timeout: number;
  state: number;
  interval: NodeJS.Timeout | null;

  constructor(manager: Manager, timeout = 5000) {
    this.manager = manager;
    this.timeout = timeout;
    this.state = WebsocketStates.IDLE;
    this.interval = null;
  }

  handleOpen() {
    if (this.state === WebsocketStates.RECONNECTING) {
      if (this.interval) clearInterval(this.interval);
      this.manager.client.console.log("[Aether] Reconnected to Websocket.");
      this.state = WebsocketStates.IDLE;
    } else {
      this.manager.client.console.log("[Aether] Connected to Websocket.");
    }
  }

  handleClose(code: number, reason: string) {
    if (this.state === WebsocketStates.IDLE) {
      this.manager.client.console.warn(
        `[Aether] Disconnected from Websocket with code ${code} and reason ${reason}.`
      );
      this.activate();
    }
  }

  handleError(error: any) {
    if (error.code === "ECONNREFUSED") {
      if (this.state === WebsocketStates.IDLE) {
        this.activate();
      }
    } else {
      this.manager.client.console.error(
        `[Aether] Received error event: ${error}`
      );
    }
  }

  activate() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(this.reconnect.bind(this), this.timeout);
  }

  reconnect() {
    this.manager.client.console.log(
      `[Aether] Attempting to reconnect with ${this.timeout}ms timeout.`
    );
    this.state = WebsocketStates.RECONNECTING;
    this.manager.ws = new Websocket(this.manager);
    this.manager.init(true);
  }
}
