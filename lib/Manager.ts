import { Reconnector } from "./ws/Reconnector";
import { Websocket } from "./ws/Websocket";
import { Command } from "./util/command";
import { disconnect } from "pm2";
import { Fire } from "./Fire";
import * as Sentry from "@sentry/node";

export class Manager {
  id: number;
  sentry: typeof Sentry;
  pm2: boolean;
  client: Fire;
  ws?: Websocket;
  reconnector: Reconnector;

  constructor(sentry?: typeof Sentry, pm2?: boolean) {
    this.id = parseInt(process.env.NODE_APP_INSTANCE || "0");
    this.sentry = sentry;
    this.pm2 = pm2;
    this.client = new Fire(this, sentry);

    if (process.env.BOOT_SINGLE === "false") {
      this.ws = new Websocket(this);
      this.reconnector = new Reconnector(this);
    }

    this.listen();
  }

  init(reconnecting = false) {
    if (process.env.BOOT_SINGLE === "false") {
      this.initWebsocket();
    }
  }

  private initWebsocket() {
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
    if (process.env.BOOT_SINGLE !== "false") {
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
    this.client?.console.warn("Destroying client...");
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
    this.client?.console.warn("Destroying client...");
    this.client?.user?.setStatus(
      "invisible",
      this.client.options.shards as number[]
    );
    this.client.commandHandler.modules.forEach(
      async (command: Command) => await command.unload()
    );
    this.client?.destroy();
    this.ws?.close(
      1001,
      `Cluster ${this.id} is shutting down due to receiving ${event} event`
    );
    disconnect();
    process.exit();
  }
}
