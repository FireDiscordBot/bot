import { Listener } from "@fire/lib/util/listener";

export default class RateLimit extends Listener {
  limited: string[]; // array of routes that are limited
  last: string; // last route

  constructor() {
    super("rateLimit", {
      emitter: "client",
      event: "rateLimit",
    });
    this.limited = [];
    this.last = null;
  }

  async exec(rateLimit: {
    timeout: number;
    limit: number;
    method: string;
    path: string;
    route: string;
    reason?: string;
  }) {
    if (!this.limited.includes(rateLimit.route)) {
      this.limited.push(rateLimit.route);
      setTimeout(() => {
        this.limited = this.limited.filter((route) => route != rateLimit.route);
      }, rateLimit.timeout);
    }
    if (rateLimit.route.includes("/messages/:id/reactions")) return;
    if (this.last == rateLimit.route) return;
    else this.last = rateLimit.route;
    if (rateLimit.limit == Infinity) return;
    this.client
      .getLogger("Rest")
      .warn(
        `Limited on route ${
          rateLimit.route
        } while trying to ${rateLimit.method?.toUpperCase()}`,
        rateLimit.reason ? `due to "${rateLimit.reason}"` : "",
        `with limit ${rateLimit.limit}, waiting for timeout of ${rateLimit.timeout}ms`
      );
  }
}
