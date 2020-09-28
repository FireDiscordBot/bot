import * as express from "express";
import * as Sentry from "@sentry/node";

import { setupRoutes } from "../src/rest/routeManager";
import { Reconnector } from "./ws/Reconnector";
import { Websocket } from "./ws/Websocket";
import { Fire } from "./Fire";

declare module "express-serve-static-core" {
  export interface Application {
    client: Fire;
  }
}

export class Manager {
  id: number;
  client: Fire;
  ws: Websocket;
  rest: express.Application;
  reconnector: Reconnector;

  constructor(sentry?: typeof Sentry) {
    this.id =
      process.env.NODE_ENV === "production"
        ? parseInt(process.env.PM2_CLUSTER_ID || "0")
        : 0;

    this.client = new Fire(this, sentry);

    if (process.env.BOOT_SINGLE === "false") {
      this.ws = new Websocket(this);
      this.reconnector = new Reconnector(this);
    }

    this.rest = express();
    this.listen();
  }

  init() {
    this.initRest();
    if (process.env.BOOT_SINGLE === "false") {
      this.initWebsocket();
    }
  }

  private initRest() {
    this.rest.client = this.client;
    setupRoutes(this.rest);

    try {
      const port = parseInt(process.env.REST_START_PORT);
      this.client.console.log(
        `[Rest] Attempting to start API on port ${port + this.id}...`
      );
      this.rest.listen(port + this.id);
      this.client.console.log(`[Rest] Running.`);
    } catch (e) {
      this.client.console.error(`[Rest] Failed to start API!\n${e.stack}`);
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
      return this.client.login();
    }
  }

  launch(shardCount: number) {
    this.client.console.log("[Sharder] Attempting to login.");
    this.client.options.shardCount = shardCount;
    return this.client.login();
  }
}
