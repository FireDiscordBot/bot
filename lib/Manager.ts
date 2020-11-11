import { MessageUtil } from "./ws/util/MessageUtil";
import { EventType } from "./ws/util/constants";
import { Reconnector } from "./ws/Reconnector";
import { Websocket } from "./ws/Websocket";
import { Command } from "./util/command";
import * as Sentry from "@sentry/node";
import { Message } from "./ws/Message";
import { disconnect } from "pm2";
import { Fire } from "./Fire";

export class Manager {
  id: number;
  sentry: typeof Sentry;
  pm2: boolean;
  client: Fire;
  ws?: Websocket;
  reconnector: Reconnector;
  replacementShardData?: { [shard: string]: { session: string; seq: number } };

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
    this.client?.console.warn("[Manager] Relaunching client...");
    this.client?.user?.setStatus(
      "invisible",
      this.client.options.shards as number[]
    );
    this.client.commandHandler.modules.forEach(
      async (command: Command) => await command.unload()
    );
    this.client?.destroy();
    delete this.client;
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
    this.ws?.close(
      1001,
      `Cluster ${this.id} is shutting down due to receiving ${event} event`
    );
    this.client?.destroy();
    disconnect();
    process.exit();
  }

  replace() {
    this.client?.console.warn("[Manager] Replacing client...");
    const shards: { [shard: number]: { session: string; seq: number } } = {};
    this.client.ws.shards.forEach((shard) => {
      shards[shard.id] = {
        session: (shard as any).sessionID,
        seq: (shard as any).sequence,
      };
    });
    this.client.ws.shards.forEach((shard) => {
      (shard as any).destroy({
        closeCode: 4000,
        reset: false,
        emit: false,
        log: false,
      });
      this.client.ws.shards.delete(shard.id);
    });
    this.ws.send(
      MessageUtil.encode(
        new Message(EventType.REPLACE_CLIENT, { id: this.id, shards })
      )
    );
    this.ws.close(4000, `Cluster ${this.id} is being replaced`);
    this.client?.console.warn("[Manager] Destroying client...");
    (this.client.ws as any).destroyed = true;
    this.client?.destroy();
    disconnect();
    process.exit();
  }

  launchReplacement(
    shardCount: number,
    shards: { [shard: string]: { session: string; seq: number } }
  ) {
    this.replacementShardData = shards;
    // figure out how to set session and shit here
    this.ws.send(
      MessageUtil.encode(
        new Message(EventType.IDENTIFY_CLIENT, {
          id: this.id,
          ready: !!this.client.readyAt,
          config: {},
        })
      )
    );
    this.client.console.log("[Aether] Sending replacement identify event.");
  }
}
