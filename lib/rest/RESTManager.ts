import { Collection, Constants } from "discord.js";
import { RequestHandler } from "./RequestHandler";
import { APIRequest } from "./APIRequest";
import routeBuilder from "./APIRouter";
import { Fire } from "../Fire";

const { Endpoints } = Constants;

export class RESTManager {
  handlers: Collection<string, RequestHandler>;
  tokenPrefix: string;
  globalTimeout: any;
  versioned: boolean;
  client: Fire;

  constructor(client: Fire, tokenPrefix = "Bot") {
    this.client = client;
    this.handlers = new Collection();
    this.tokenPrefix = tokenPrefix;
    this.versioned = true;
    this.globalTimeout = null;
    if (client.options.restSweepInterval > 0) {
      client.setInterval(() => {
        this.handlers.sweep((handler) => handler._inactive);
      }, client.options.restSweepInterval * 1000);
    }
  }

  get api() {
    return routeBuilder(this);
  }

  getAuth() {
    // @ts-ignore
    const token = this.client.token || this.client?.accessToken;
    if (token) return `${this.tokenPrefix} ${token}`;
    throw new Error("TOKEN_MISSING");
  }

  get cdn() {
    return Endpoints.CDN(this.client.options.http.cdn);
  }

  request(method: string, url: string, options = {}) {
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
