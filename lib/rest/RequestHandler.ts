import { AsyncQueue } from "@sapphire/async-queue";
import * as centra from "centra";
import { Constants, DiscordAPIError, HTTPError } from "discord.js";
import { constants } from "../util/constants";
import { APIRequest } from "./APIRequest";
import { RateLimitError } from "./RateLimitError";
import { RESTManager } from "./RESTManager";

const {
  Events: { DEBUG, RATE_LIMIT, INVALID_REQUEST_WARNING },
} = Constants;

const { discord } = constants.regexes;

const parseResponse = async (res: centra.Response) => {
  if (res.headers["content-type"]?.includes("application/json")) {
    const json = await res.json();
    return json;
  }
  return res.body.toString();
};

const getAPIOffset = (serverDate: string) => {
  return new Date(serverDate).getTime() - Date.now();
};

const calculateReset = (reset: any, resetAfter: string, serverDate: string) => {
  if (resetAfter) {
    return Date.now() + Number(resetAfter) * 1000;
  }
  return new Date(Number(reset) * 1000).getTime() - getAPIOffset(serverDate);
};

/* Invalid request limiting is done on a per-IP basis, not a per-token basis.
 * The best we can do is track invalid counts process-wide (on the theory that
 * users could have multiple bots run from one process) rather than per-bot.
 * Therefore, store these at file scope here rather than in the client's
 * RESTManager object.
 */
let invalidCount = 0;
let invalidCountResetTime = null;

export class RequestHandler {
  manager: RESTManager;
  remaining: number;
  queue: AsyncQueue;
  reset: number;
  limit: number;

  constructor(manager: RESTManager) {
    this.manager = manager;
    this.queue = new AsyncQueue();
    this.remaining = -1;
    this.reset = -1;
    this.limit = -1;
  }

  async push(request: APIRequest) {
    await this.queue.wait();
    try {
      return await this.execute(request);
    } finally {
      this.queue.shift();
    }
  }

  get globalLimited() {
    return (
      this.manager.globalRemaining <= 0 && Date.now() < this.manager.globalReset
    );
  }

  get localLimited() {
    return this.remaining <= 0 && Date.now() < this.reset;
  }

  get limited() {
    return this.globalLimited || this.localLimited;
  }

  get _inactive() {
    return this.queue.remaining === 0 && !this.limited;
  }

  globalDelayFor(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.manager.globalDelay = null;
        resolve();
      }, ms);
    });
  }

  async onRateLimit(
    request: APIRequest,
    limit: number,
    timeout: number,
    isGlobal: boolean
  ) {
    const { options } = this.manager.client;
    if (!options.rejectOnRateLimit) return;

    const rateLimitData = {
      timeout,
      limit,
      method: request.method,
      path: request.path,
      route: request.route,
      global: isGlobal,
    };
    const shouldThrow =
      typeof options.rejectOnRateLimit === "function"
        ? await options.rejectOnRateLimit(rateLimitData)
        : options.rejectOnRateLimit.some((route) =>
            rateLimitData.route.startsWith(route.toLowerCase())
          );
    if (shouldThrow) {
      throw new RateLimitError(rateLimitData);
    }
  }

  async execute(request: APIRequest) {
    /*
     * After calculations have been done, pre-emptively stop further requests
     * Potentially loop until this task can run if e.g. the global rate limit is hit twice
     */
    while (this.limited) {
      const isGlobal = this.globalLimited;
      let limit: number, timeout: number, delayPromise: Promise<void>;

      if (isGlobal) {
        // Set the variables based on the global rate limit
        limit = this.manager.globalLimit;
        timeout =
          this.manager.globalReset +
          this.manager.client.options.restTimeOffset -
          Date.now();
      } else {
        // Set the variables based on the route-specific rate limit
        limit = this.limit;
        timeout =
          this.reset + this.manager.client.options.restTimeOffset - Date.now();
      }

      if (this.manager.client.listenerCount(RATE_LIMIT))
        this.manager.client.emit(RATE_LIMIT, {
          timeout,
          limit,
          method: request.method,
          path: request.path,
          route: request.route,
          global: isGlobal,
          reason: request.options.reason,
        } as any);

      if (isGlobal) {
        // If this is the first task to reach the global timeout, set the global delay
        if (!this.manager.globalDelay) {
          // The global delay function should clear the global delay state when it is resolved
          this.manager.globalDelay = this.globalDelayFor(timeout);
        }
        delayPromise = this.manager.globalDelay;
      } else {
        delayPromise = this.manager.client.util.sleep(timeout);
      }

      // Determine whether a RateLimitError should be thrown
      await this.onRateLimit(request, limit, timeout, isGlobal);

      // Wait for the timeout to expire in order to avoid an actual 429
      await delayPromise;
    }

    // As the request goes out, update the global usage information
    if (!this.manager.globalReset || this.manager.globalReset < Date.now()) {
      this.manager.globalReset = Date.now() + 1000;
      this.manager.globalRemaining = this.manager.globalLimit;
    }
    this.manager.globalRemaining--;

    // Perform the request
    let res: centra.Response;
    try {
      res = await request.make();
      this.checkLatency(request, res);
    } catch (error) {
      // Retry the specified number of times for request abortions
      if (request.retries === this.manager.client.options.retryLimit) {
        throw new HTTPError(
          error.message,
          error.constructor.name,
          error.status,
          request
        );
      }

      request.retries++;
      return this.execute(request);
    }

    let sublimitTimeout: number;
    if (res && res.headers) {
      const serverDate = res.headers.date;
      const limit = res.headers["x-ratelimit-limit"];
      const remaining = res.headers["x-ratelimit-remaining"];
      const reset = res.headers["x-ratelimit-reset"];
      const resetAfter = res.headers["x-ratelimit-reset-after"];

      this.limit = limit ? Number(limit) : Infinity;
      this.remaining = remaining ? Number(remaining) : 1;

      this.reset =
        reset || resetAfter
          ? calculateReset(reset, resetAfter as string, serverDate)
          : Date.now();

      // https://github.com/discordapp/discord-api-docs/issues/182
      if (!resetAfter && request.route.includes("reactions")) {
        this.reset =
          new Date(serverDate).getTime() - getAPIOffset(serverDate) + 250;
      }

      // Handle retryAfter, which means we have actually hit a rate limit
      let retryAfter = Number(res.headers["retry-after"]);
      retryAfter = retryAfter ? retryAfter * 1000 : -1;
      if (retryAfter > 0) {
        // If the global ratelimit header is set, that means we hit the global rate limit
        if (res.headers["x-ratelimit-global"]) {
          this.manager.globalRemaining = 0;
          this.manager.globalReset = Date.now() + retryAfter;
        } else if (!this.localLimited) {
          /*
           * This is a sublimit (e.g. 2 channel name changes/10 minutes) since the headers don't indicate a
           * route-wide rate limit. Don't update remaining or reset to avoid rate limiting the whole
           * endpoint, just set a reset time on the request itself to avoid retrying too soon.
           */
          sublimitTimeout = retryAfter;
        }
      }
    }

    this.logRequest(request, res);

    // Count the invalid requests
    if (
      res.statusCode === 401 ||
      res.statusCode === 403 ||
      res.statusCode === 429
    ) {
      if (!invalidCountResetTime || invalidCountResetTime < Date.now()) {
        invalidCountResetTime = Date.now() + 1000 * 60 * 10;
        invalidCount = 0;
      }
      invalidCount++;

      const emitInvalid =
        this.manager.client.listenerCount(INVALID_REQUEST_WARNING) &&
        this.manager.client.options.invalidRequestWarningInterval > 0 &&
        invalidCount %
          this.manager.client.options.invalidRequestWarningInterval ===
          0;
      if (emitInvalid) {
        /**
         * Emitted periodically when the process sends invalid messages to let users avoid the
         * 10k invalid requests in 10 minutes threshold that causes a ban
         * @event Client#invalidRequestWarning
         * @param {number} invalidRequestWarningInfo.count Number of invalid requests that have been made in the window
         * @param {number} invalidRequestWarningInfo.remainingTime Time in ms remaining before the count resets
         */
        this.manager.client.emit(INVALID_REQUEST_WARNING, {
          count: invalidCount,
          remainingTime: invalidCountResetTime - Date.now(),
        });
      }
    }

    // Handle 2xx and 3xx responses
    if (res.statusCode >= 200 && res.statusCode < 400) {
      // Nothing wrong with the request, proceed with the next one
      return parseResponse(res);
    }

    // Handle 4xx responses
    if (res.statusCode >= 400 && res.statusCode < 500) {
      // Handle ratelimited requests
      if (res.statusCode === 429) {
        const isGlobal = this.globalLimited;
        let limit: number, timeout: number;
        if (isGlobal) {
          // Set the variables based on the global rate limit
          limit = this.manager.globalLimit;
          timeout =
            this.manager.globalReset +
            this.manager.client.options.restTimeOffset -
            Date.now();
        } else {
          // Set the variables based on the route-specific rate limit
          limit = this.limit;
          timeout =
            this.reset +
            this.manager.client.options.restTimeOffset -
            Date.now();
        }

        this.manager.client.emit(
          DEBUG,
          `Hit a 429 while executing a request.
    Global  : ${isGlobal}
    Method  : ${request.method}
    Path    : ${request.path}
    Route   : ${request.route}
    Limit   : ${limit}
    Timeout : ${timeout}ms
    Sublimit: ${sublimitTimeout ? `${sublimitTimeout}ms` : "None"}`
        );

        await this.onRateLimit(request, limit, timeout, isGlobal);

        // If caused by a sublimit, wait it out here so other requests on the route can be handled
        if (sublimitTimeout) {
          await this.manager.client.util.sleep(sublimitTimeout);
        }
        return this.execute(request);
      }

      // Handle possible malformed requests
      let data: object | Buffer;
      try {
        data = await parseResponse(res);
      } catch (err) {
        throw new HTTPError(
          err.message,
          err.constructor.name,
          err.status,
          request
        );
      }

      if (
        request.route.includes("commands") &&
        res.statusCode == 404 &&
        request.client.options.http.api.includes("inv.wtf")
      )
        return;

      if (
        !(
          request.route.endsWith("/messages/:id") &&
          request.method == "delete" &&
          res.statusCode == 404
        )
      )
        throw new DiscordAPIError(data, res.statusCode, request);
    }

    // Handle 5xx responses
    if (res.statusCode >= 500 && res.statusCode < 600) {
      if (
        request.client.useCanary &&
        (res.statusCode == 502 || res.statusCode == 503)
      )
        request.client.useCanary = false;
      else if (
        !request.client.useCanary &&
        (res.statusCode == 502 || res.statusCode == 503)
      )
        request.client.useCanary = true;

      // Retry the specified number of times for possible serverside issues
      if (request.retries === this.manager.client.options.retryLimit)
        throw new HTTPError(
          res.coreRes.statusMessage,
          res.constructor.name,
          res.statusCode,
          request
        );

      request.retries++;
      return this.execute(request);
    }

    // Fallback in the rare case a status code outside the range 200..=599 is returned
    return null;
  }

  logRequest(request: APIRequest, response?: centra.Response) {
    const fields = {
      path: request.path,
      status: response?.statusCode ?? 500,
      method: request.method,
      retries: request.retries,
      limit: 0,
      remaining: 0,
    };
    if (typeof this.limit == "number" && this.limit) fields.limit = this.limit;
    if (typeof this.remaining == "number" && this.remaining)
      fields.remaining = this.remaining;
    this.manager.client.influx([
      {
        measurement: "requests",
        tags: {
          cluster: request.client.manager.id.toString(),
          // TODO: maybe figure out if we can figure out the shard
          // belonging to any item (guild, channel, message etc.) in the request
        },
        fields,
      },
    ]);
  }

  checkLatency(request: APIRequest, response?: centra.Response) {
    const latency = request.client.restPing;
    this.manager.client.influx([
      {
        measurement: "restLatency",
        tags: {
          cluster: request.client.manager.id.toString(),
          route: request.options.route
            .replace(discord.snowflake, ":id")
            .replace(discord.webhookPartial, "$1/:id/:token"),
        },
        fields: {
          latency,
        },
      },
    ]);
    const useHigher = !!(request.options.files && request.options.files.length);
    let type: "high" | "extreme";
    if (useHigher ? latency > 15000 : latency > 10000) type = "high";
    if (useHigher ? latency > 25000 : latency > 15000) type = "extreme";
    if (
      !type ||
      (response.statusCode.toString().startsWith("2") && latency < 25000)
    )
      return;
    request.client.console[type == "high" ? "warn" : "error"](
      `[Rest] Encountered ${type} latency of ${latency}ms on ${request.method.toUpperCase()} ${
        request.path
      }`
    );
  }
}
