import { startRouteManager } from "../src/rest/routeManager";
import { ErrorResponse, ResponseLocals } from "../src/rest/interfaces";
import { Reconnector } from "./ws/Reconnector";
import { sendError } from "../src/rest/utils";
import { Websocket } from "./ws/Websocket";
import { Fire } from "./Fire";
import * as express from "express";

export class Manager {
  id: number;
  client: Fire;
  ws: Websocket;
  rest: express.Application;
  reconnector: Reconnector;

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
    this.rest = express();
    this.listen();
  }

  init() {
    this.rest.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const locals: ResponseLocals = {
          client: this.client,
        };
        res.locals = locals;
        return next();
      }
    );
    startRouteManager(this.rest, this.client);
    try {
      this.client.console.log(
        `[Rest] Attempting to start API on port ${
          parseInt(process.env.REST_START_PORT) + this.id
        }...`
      );
      this.rest.listen(parseInt(process.env.REST_START_PORT) + this.id);
      this.client.console.log(`[Rest] Running.`);
    } catch (e) {
      this.client.console.error(`[Rest] Failed to start API!\n${e.stack}`);
    }
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
