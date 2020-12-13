import { WebsocketStates } from "./util/constants";
import { Websocket } from "./Websocket";
import { Manager } from "../Manager";

export class Reconnector {
  manager: Manager;
  state: number;
  timeout: NodeJS.Timeout | null;

  constructor(manager: Manager) {
    this.manager = manager;
    this.state = WebsocketStates.IDLE;
    this.timeout = null;
  }

  handleOpen() {
    if (this.state == WebsocketStates.RECONNECTING) {
      if (this.timeout) clearTimeout(this.timeout);
      this.manager.client.console.log("[Aether] Reconnected to Websocket.");
      this.state = WebsocketStates.CONNECTED;
    } else {
      this.manager.client.console.log("[Aether] Connected to Websocket.");
      this.state = WebsocketStates.CONNECTED;
    }
  }

  handleClose(code: number, reason: string) {
    clearInterval(this.manager.ws?.keepAlive);
    if (code == 4007)
      // Cluster has been overwriten
      this.manager.kill("overwrite");
    if (
      this.state == WebsocketStates.CONNECTED ||
      this.state == WebsocketStates.CLOSING
    ) {
      this.state = WebsocketStates.CLOSED;
      this.manager.client.console.warn(
        `[Aether] Disconnected from Websocket with code ${code} and reason ${reason}.`
      );
      this.activate();
    }
  }

  handleError(error: any) {
    if (error.code == "ECONNREFUSED") {
      if (
        this.state == WebsocketStates.CLOSED ||
        this.state == WebsocketStates.IDLE
      ) {
        this.activate();
      }
    } else {
      this.manager.client.console.error(
        `[Aether] Received error event: ${error}`
      );
      this.activate(15000);
    }
  }

  activate(timeout: number = 5000) {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(this.reconnect.bind(this), timeout);
  }

  reconnect() {
    // it likes to try reconnect while already connected sometimes
    // why? not a single fucking clue
    if (this.manager.ws?.readyState == this.manager.ws?.OPEN)
      this.manager.ws.close(4000, "brb");
    this.state = WebsocketStates.RECONNECTING;
    this.manager.ws = new Websocket(this.manager);
    this.manager.init(true);
  }
}
