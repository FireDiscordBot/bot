import { EventHandler } from "./ws/event/EventHandler";
import { ManagerState } from "./interfaces/aether";
import { Reconnector } from "./ws/Reconnector";
import { version as djsver } from "discord.js";
import { Websocket } from "./ws/Websocket";
import { Command } from "./util/command";
import * as Sentry from "@sentry/node";
import { Fire } from "./Fire";

export class Manager {
  state: Partial<ManagerState> = {};
  private _ready: boolean = false;
  eventHandler: EventHandler;
  reconnector: Reconnector;
  killing: boolean = false;
  sentry: typeof Sentry;
  session?: string;
  version: string;
  ws?: Websocket;
  client: Fire;
  seq?: number;
  id: number;

  constructor(version: string, sentry?: typeof Sentry) {
    this.version = version;
    this.sentry = sentry;

    this.client = new Fire(this, sentry);

    if (process.env.BOOT_SINGLE == "false") {
      this.eventHandler = new EventHandler(this);
      this.reconnector = new Reconnector(this);
      this.eventHandler.store.init();
      this.ws = new Websocket(this);
    } else this.id = 0; // default to shard 0

    this.listen();
  }

  get ua() {
    return `Fire Discord Bot/${this.version} Node.JS/${process.version} (+https://fire.gaminggeek.dev/)`;
  }

  get djsua() {
    return `DiscordBot (https://discord.js.org, ${djsver}) Fire/${this.version} Node.JS/${process.version}`;
  }

  get isDist() {
    return __dirname.includes("/dist/") || __dirname.includes("\\dist\\");
  }

  get ready() {
    return this._ready;
  }

  set ready(state: boolean) {
    this._ready = state;
    if (state && this.reconnector.sessionTimeout)
      clearTimeout(this.reconnector.sessionTimeout);
  }

  init(reconnecting = false) {
    if (reconnecting && this.ws?.open) return;
    if (process.env.BOOT_SINGLE == "false") {
      this.initWebsocket();
    }
  }

  private initWebsocket() {
    if (this.ws?.open)
      return this.client.console.warn(
        `[Manager] Tried to initialize websocket while already open with state ${this.ws.readyState}`
      );
    this.ws.init();

    this.ws.once("open", () => {
      this.client.console.log("[Sharder] WS opened.");
      if (this.client.readyAt) this.client.setReadyPresence();
      this.reconnector.handleOpen();
    });

    this.ws.once("close", (code: number, reason: string) => {
      this.client.console.warn("[Sharder] WS closed.");
      if (this.client.readyAt) this.client.setPartialOutageStatus();
      this.ws.subscribed = [];
      this.reconnector.handleClose(code, reason);
    });

    this.ws.once("error", (error: any) => {
      this.client.console.error("[Sharder] WS errored.");
      this.reconnector.handleError(error);
    });
  }

  listen() {
    if (process.env.BOOT_SINGLE != "false") {
      this.client.options.shardCount = 1;
      this.client.options.presence.shardId = this.client.options.shards = [
        this.id,
      ];
      return this.client.login();
    }
  }

  launch(data: {
    id: number;
    session: string;
    shardCount: number;
    shards: number[];
  }) {
    this.client.console.log(`[Sharder] Received sharding config.`);
    this.id = data.id;
    this.session = data.session;
    this.client.options.presence.shardId = this.client.options.shards =
      data.shards;
    this.client.options.shardCount = data.shardCount;
    this.client.sentry.setTag("cluster", this.id);
    return this.client.login();
  }

  async kill(event: string) {
    if (this.killing) return;
    this.killing = true;
    this.client?.console.warn(`[Manager] Destroying client (${event})`);
    await this.client?.user?.setStatus(
      "invisible",
      this.client.options.shards as number[]
    );
    await Promise.all(
      this.client.commandHandler.modules.map((command: Command) =>
        command.unload()
      )
    );
    this.client?.destroy();
    if (this.ws?.open) this.ws.close(1001, event);
    process.exit();
  }
}
