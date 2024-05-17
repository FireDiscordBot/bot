import { Fire } from "@fire/lib/Fire";
import { Collection, Constants } from "discord.js";
import { APIRequest } from "./APIRequest";
import routeBuilder, { RequestOptions } from "./APIRouter";
import { RequestHandler } from "./RequestHandler";

const { Endpoints } = Constants;

export class RESTManager {
  handlers: Collection<string, RequestHandler>;
  globalDelay: Promise<void>;
  globalRemaining: number;
  globalLimit: number;
  globalReset: number;
  versioned: boolean;
  client: Fire;

  constructor(client: Fire) {
    this.client = client;
    this.handlers = new Collection();
    this.versioned = true;
    this.globalLimit =
      client.options.restGlobalRateLimit > 0
        ? client.options.restGlobalRateLimit
        : Infinity;
    this.globalRemaining = this.globalLimit;
    this.globalReset = null;
    this.globalDelay = null;
    if (client.options.restSweepInterval > 0) {
      setInterval(() => {
        this.handlers.sweep((handler) => handler._inactive);
      }, client.options.restSweepInterval * 1000);
    }
  }

  get api() {
    return routeBuilder(this);
  }

  getAuth() {
    if (this.client.token) return `Bot ${this.client.token}`;
    throw new Error("TOKEN_MISSING");
  }

  get cdn() {
    return Endpoints.CDN(this.client.options.http.cdn);
  }

  request(method: string, url: string, options: RequestOptions = {}) {
    const apiRequest = new APIRequest(this, method, url, options);
    let handler = this.handlers.get(apiRequest.route);

    if (!handler) {
      handler = new RequestHandler(this);
      this.handlers.set(apiRequest.route, handler);
    }

    return handler.push(apiRequest);
  }

  get endpoint() {
    return this.client.options.http.api;
  }

  set endpoint(endpoint) {
    this.client.options.http.api = endpoint;
  }
}
