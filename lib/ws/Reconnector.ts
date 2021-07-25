import { EventType, WebsocketStates } from "./util/constants";
import { MessageUtil } from "./util/MessageUtil";
import { Manager } from "@fire/lib/Manager";
import { Websocket } from "./Websocket";
import { Message } from "./Message";

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
      if (this.manager.client)
        this.manager.ws?.send(
          MessageUtil.encode(
            new Message(
              EventType.DISCOVERY_UPDATE,
              this.manager.client.util.getDiscoverableGuilds()
            )
          )
        );
    } else {
      this.manager.client.console.log("[Aether] Connected to Websocket.");
      this.state = WebsocketStates.CONNECTED;
    }
  }

  handleClose(code: number, reason: string) {
    clearInterval(this.manager.ws?.keepAlive);
    if (
      this.state == WebsocketStates.CONNECTED ||
      this.state == WebsocketStates.CLOSING
    ) {
      this.state = WebsocketStates.CLOSED;
      this.manager.client.console.warn(
        `[Aether] Disconnected from Websocket with code ${code} and reason ${reason}.`
      );
    }
    if (code == 1006) this.manager.ws?.terminate();
    if (code == 1012) {
      // Aether has shut down, session will be invalid
      // I'll eventually make sessions persist though
      delete this.manager.session;
      delete this.manager.seq;
      return this.activate(
        process.env.NODE_ENV == "development" ? 10000 : 2500
      ); // takes longer to reboot in dev
    }
    if (code == 4007)
      // Cluster has attempted to connect multiple times
      // so kill the process and let pm2 restart it
      this.manager.kill("replaced");
    if (code == 4029)
      // This means that the current process is
      // an extra, so it's unnecessary to keep alive
      this.manager.kill("extra");
    if (code == 4005) {
      delete this.manager.session;
      delete this.manager.seq;
      return this.activate(0); // reconnect instantly for new session
    }
    this.activate();
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
    if (!timeout) return this.reconnect(false);
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(this.reconnect.bind(this), timeout);
  }

  reconnect(log = true) {
    if (log)
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
