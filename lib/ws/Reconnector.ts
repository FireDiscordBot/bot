import { WebsocketStates } from "./util/constants";
import { Websocket } from "./Websocket";
import { Manager } from "@fire/lib/Manager";

export class Reconnector {
  timeout?: NodeJS.Timeout;
  manager: Manager;
  state: number;

  constructor(manager: Manager) {
    this.manager = manager;
    this.state = WebsocketStates.IDLE;
    this.timeout = null;
  }

  handleOpen() {
    if (this.timeout) clearTimeout(this.timeout);
    if (this.state == WebsocketStates.RECONNECTING) {
      this.manager.client.console.log("[Aether] Reconnected to Websocket.");
      this.state = WebsocketStates.CONNECTED;
    } else {
      this.manager.client.console.log("[Aether] Connected to Websocket.");
      this.state = WebsocketStates.CONNECTED;
    }
  }

  handleClose(code: number, reason: string) {
    clearInterval(this.manager.ws?.keepAlive);
    if (code == 1006) this.manager.ws?.terminate();
    if (code == 4007)
      // Cluster has attempted to connect multiple times
      // so kill the process and let pm2 restart it
      this.manager.kill("replaced");
    if (code == 4029)
      // This means that the current process is
      // an extra, so it's unnecessary to keep alive
      this.manager.kill("extra");
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
    if (error.code == "ECONNREFUSED") this.activate(8000);
    else {
      this.manager.client.console.error(
        `[Aether] Received error event: ${error}`
      );
      this.activate(5000);
    }
  }

  activate(timeout: number = 5000) {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(this.reconnect.bind(this), timeout);
  }

  reconnect() {
    this.manager.client.console.info(`[Aether] Attempting to reconnect...`);
    // it likes to try reconnect while already connected sometimes
    // why? not a single fucking clue
    if (this.manager.ws?.open) this.manager.ws.close(4000, "brb");
    this.state = WebsocketStates.RECONNECTING;
    this.manager.ws?.removeAllListeners();
    this.manager.ws?.terminate();
    delete this.manager.ws;
    this.manager.ws = new Websocket(this.manager);
    this.manager.init(true);
  }
}
