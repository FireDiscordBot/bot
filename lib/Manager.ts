import { Reconnector } from "./ws/Reconnector";
import { Websocket } from "./ws/Websocket";
import { Command } from "./util/command";
import * as Sentry from "@sentry/node";
import { Fire } from "./Fire";

export class Manager {
  reconnector: Reconnector;
  sentry: typeof Sentry;
  ws?: Websocket;
  client: Fire;
  id: number;

  constructor(sentry?: typeof Sentry) {
    this.id = parseInt(process.env.NODE_APP_INSTANCE || "0");
    this.sentry = sentry;
    this.client = new Fire(this, sentry);

    if (process.env.BOOT_SINGLE == "false") {
      this.ws = new Websocket(this);
      this.reconnector = new Reconnector(this);
    }

    this.listen();
  }

  init(reconnecting = false) {
    if (reconnecting && this.ws.readyState == this.ws.OPEN) return;
    if (process.env.BOOT_SINGLE == "false") {
      this.initWebsocket();
    }
  }

  private initWebsocket() {
    if (this.ws.readyState == this.ws.OPEN)
      return this.client.console.warn(
        `[Manager] Tried to initialize websocket while already open with state ${this.ws.readyState}`
      );
    this.ws.init();

    this.ws.on("open", () => {
      this.client.console.log("[Sharder] WS opened.");
      this.reconnector.handleOpen();
    });

    this.ws.on("close", (code: number, reason: string) => {
      this.client.console.warn("[Sharder] WS closed.");
      this.reconnector.handleClose(code, reason);
    });

    this.ws.on("error", (error: any) => {
      this.client.console.error("[Sharder] WS errored.");
      this.reconnector.handleError(error);
    });
  }

  listen() {
    if (process.env.BOOT_SINGLE != "false") {
      this.client.options.shardCount = 1;
      this.client.options.presence.shardID = this.client.options.shards = [
        this.id,
      ];
      return this.client.login();
    }
  }

  launch(data: { shardCount: number; shards: number[] }) {
    this.client.console.log("[Sharder] Attempting to login.");
    this.client.options.presence.shardID = this.client.options.shards =
      data.shards;
    this.client.options.shardCount = data.shardCount;
    return this.client.login();
  }

  relaunch(data: { shardCount: number; shards: number[] }) {
    this.client?.console.warn("[Manager] Destroying client...");
    this.client?.user?.setStatus(
      "invisible",
      this.client.options.shards as number[]
    );
    this.client.commandHandler.modules.forEach(
      async (command: Command) => await command.unload()
    );
    this.client?.destroy();
    this.client = new Fire(this, this.sentry);
    this.launch(data);
  }

  kill(event: string) {
    this.client?.console.warn("[Manager] Destroying client...");
    this.client?.user?.setStatus(
      "invisible",
      this.client.options.shards as number[]
    );
    this.client.commandHandler.modules.forEach(
      async (command: Command) => await command.unload()
    );
    this.client?.destroy();
    if (this.ws?.readyState == this.ws?.OPEN)
      this.ws?.close(
        1001,
        `Cluster ${this.id} is shutting down due to receiving ${event} event`
      );
    process.exit();
  }
}
