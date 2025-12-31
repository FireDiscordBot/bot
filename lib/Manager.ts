import * as Sentry from "@sentry/node";
import { Collection, version as djsver, SnowflakeUtil } from "discord.js";
import { isDeepStrictEqual } from "util";
import { Fire } from "./Fire";
import {
  IPoint,
  IQueryOptions,
  IWriteOptions,
  ManagerState,
} from "./interfaces/aether";
import { Command } from "./util/command";
import { FireConsole } from "./util/console";
import { constants } from "./util/constants";
import { getCommitHash } from "./util/gitUtils";
import { Module } from "./util/module";
import { Message } from "./ws/Message";
import { Reconnector } from "./ws/Reconnector";
import { Websocket } from "./ws/Websocket";
import { EventHandler } from "./ws/event/EventHandler";
import { MessageUtil } from "./ws/util/MessageUtil";
import { EventType } from "./ws/util/constants";

type InfluxPoints = { points: IPoint[]; options?: IWriteOptions }[];

export class Manager {
  readonly REST_HOST = process.env.REST_HOST
    ? `https://${process.env.REST_HOST}`
    : process.env.REST_PORT
      ? `http://127.0.0.1:${process.env.REST_PORT}`
      : null; // realistically never gonna be encountered
  readonly CURRENT_REST_VERSION = "v2";
  readonly REST_SUFFIX = process.env.REST_SUFFIX ?? ".prod";

  private loggers: Collection<string, FireConsole> = new Collection();
  console: FireConsole = new FireConsole();

  state: ManagerState = {
    // we set it to empty values so that
    // if something tries to access state too early,
    // they'll just get empty data rather than needing
    // to check if the property exists
    optifineVersions: {},
    guildExperiments: [],
    browserUserAgent: "",
    userExperiments: [],
    guildConfigs: {},
    userConfigs: {},
    modVersions: {},
    subscribed: [],
    appEmojis: [],
  };
  private _ready: boolean = false;
  influxQueue: InfluxPoints = [];
  eventHandler: EventHandler;
  reconnector: Reconnector;
  killing: boolean = false;
  sentry: typeof Sentry;
  session?: string;
  version: string;
  commit: string;
  ws?: Websocket;
  client: Fire;
  seq?: number;
  id: number;

  constructor(version: string, sentry?: typeof Sentry) {
    this.version = version;
    this.sentry = sentry;
    this.commit = getCommitHash();

    this.client = new Fire(this, sentry);

    if (process.env.BOOT_SINGLE == "false") {
      this.eventHandler = new EventHandler(this);
      this.reconnector = new Reconnector(this);
      this.eventHandler.store.init();
      this.ws = new Websocket(this);
    } else {
      this.id = 0; // default to shard 0
      this.client.options.shardCount = 1;
      this.client.options.presence.shardId = this.client.options.shards = [
        this.id,
      ];
      this.client.login();
    }
  }

  get ua() {
    return `Fire Discord Bot/${this.version} Node.JS/${process.version} (+${constants.url.website})`;
  }

  get djsua() {
    return `DiscordBot (https://discord.js.org, ${djsver}) Fire/${this.version} Node.JS/${process.version}`;
  }

  get browserua() {
    return (
      this.state.browserUserAgent ??
      "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
    );
  }

  get isDist() {
    return __dirname.includes("/dist/") || __dirname.includes("\\dist\\");
  }

  get ready() {
    return this._ready;
  }

  set ready(state: boolean) {
    this._ready = state;
    if (state && this.reconnector?.sessionTimeout)
      clearTimeout(this.reconnector.sessionTimeout);
  }

  getLogger(tag: string) {
    if (!this.loggers.has(tag)) this.loggers.set(tag, new FireConsole(tag));
    return this.loggers.get(tag);
  }

  init(reconnecting = false) {
    if (reconnecting && this.ws?.open) return;
    if (process.env.BOOT_SINGLE == "false") {
      this.initWebsocket();
    }
  }

  private initWebsocket() {
    if (this.ws?.open)
      return this.getLogger("Manager").warn(
        `Tried to initialize websocket while already open with state ${this.ws.readyState}`
      );
    this.ws.init();

    this.ws.once("open", () => {
      this.getLogger("Aether").log("Websocket opened");
      if (this.client.readyAt) this.client.setReadyPresence();
      this.reconnector.handleOpen();
    });

    this.ws.once("close", (code: number, reason: Buffer | string) => {
      this.getLogger("Aether").warn("WS closed");
      // this will be sent when we next connect, assuming we don't restart before then
      this.writeToInflux([
        {
          measurement: "cluster_ws_closures",
          tags: { id: this.id?.toString() ?? "No ID", session: this.session },
          fields: {
            code,
            reason: reason.toString(),
            session: this.session,
            lastPing: this.ws.lastPing?.toLocaleTimeString() ?? "Never",
            clientSideClose: this.ws.clientSideClose?.toString() ?? "unknown",
          },
        },
      ]);
      if (this.client.readyAt) this.client.setPartialOutageStatus();
      this.reconnector.handleClose(code, reason.toString());
    });

    this.ws.once("error", (error) => {
      this.getLogger("Aether").error("Websocket errored\n", error.stack);
      this.reconnector.handleError(error);
    });
  }

  launch(data: {
    id: number;
    session: string;
    shardCount: number;
    shards: number[];
  }) {
    this.getLogger("Aether").log("Received sharding config");
    this.id = data.id;
    this.session = data.session;
    this.client.options.presence.shardId = this.client.options.shards =
      data.shards;
    this.client.options.shardCount = data.shardCount;
    if (this.client.sentry) this.client.sentry.setTag("cluster", this.id);
    return this.client.login();
  }

  async kill(event: string) {
    if (this.killing) return;
    this.killing = true;
    this.getLogger("Manager").warn(`Destroying client (${event})`);
    if (this.ws?.open) this.ws.close(1001, event);
    this.client?.user?.setStatus(
      "invisible",
      this.client.options.shards as number[]
    );
    await Promise.all([
      ...this.client.commandHandler.modules.map((command: Command) =>
        command.unload()
      ),
      ...this.client.modules.modules.map((module: Module) => module.unload()),
    ]);
    this.client?.destroy();
    process.exit();
  }

  writeToInflux(points: IPoint[], options?: IWriteOptions) {
    if (!this.ws?.open) {
      const hasMatchingOptions = this.influxQueue.findIndex((queue) => {
        return isDeepStrictEqual(queue.options, options);
      });
      if (hasMatchingOptions != -1)
        return this.influxQueue[hasMatchingOptions].points.push(...points);
      else return this.influxQueue.push({ points, options });
    }
    this.ws?.send(
      MessageUtil.encode(
        new Message(
          EventType.WRITE_INFLUX_POINTS,
          { points, options },
          // nonce is used to allow returning errors, but we don't currently care about them
          (+new Date()).toString()
        )
      )
    );
  }

  queryInflux(query: string, options?: IQueryOptions) {
    return new Promise<any[]>((resolve, reject) => {
      if (!this.ws?.open) return reject();
      const nonce = SnowflakeUtil.generate();
      const handle = (
        data:
          | { success: true; results: any[] }
          | { success: false; error: string }
      ) => {
        if (data.success == false) return reject(data.error);
        else resolve(data.results);
      };
      this.ws.handlers.set(nonce, handle);
      this.ws.send(
        MessageUtil.encode(
          new Message(EventType.INFLUX_QUERY, { query, options }, nonce)
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.ws.handlers.has(nonce)) {
          this.ws.handlers.delete(nonce);
          reject();
        }
      }, 30000);
    });
  }
}
