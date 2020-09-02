import { Fire } from "./Fire";

const Websocket = require("./ws/Websocket");
const Reconnector = require("./ws/Reconnector");

export class Manager {
  id: number;
  client: Fire;
  ws: typeof Websocket;
  reconnector: typeof Reconnector;

  constructor(sentry: any) {
    this.id =
      process.env.NODE_ENV === "production"
        ? parseInt(process.env.PM2_CLUSTER_ID || "0")
        : 0;
    this.client = new Fire(this, sentry);
    if (process.env.BOOT_SINGLE === "false") {
      this.ws = new Websocket(this);
      this.reconnector = new Reconnector(this);
    }
    this.listen();
  }

  init() {
    if (process.env.BOOT_SINGLE !== "false") return;
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
      return this.client.login();
    }
  }

  launch(data: any) {
    this.client.console.log("[Sharder] Attempting to login.");
    this.client.options.shardCount = data;
    this.client.login();
  }
}
