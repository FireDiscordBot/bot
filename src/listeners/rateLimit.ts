import { Listener } from "../../lib/util/listener";

export default class RateLimit extends Listener {
  constructor() {
    super("rateLimit", {
      emitter: "client",
      event: "rateLimit",
    });
  }

  async exec(
    timeout:
      | number
      | {
          timeout: number;
          limit: number;
          method: string;
          path: string;
          route: string;
        },
    limit: number,
    method: string,
    path: string,
    route: string
  ) {
    if (typeof timeout == "object")
      this.client.console.warn(
        `[Rest] Limited on route ${
          timeout.route
        } while trying to ${timeout.method?.toUpperCase()} with limit ${
          timeout.limit
        }, waiting for timeout of ${timeout.timeout}ms`
      );
    else
      this.client.console.warn(
        `[Rest] Limited on route ${route}${
          method ? " while trying to" + method.toUpperCase() : ""
        } with limit ${limit ? limit : "unknown"}, waiting for timeout of ${
          typeof timeout == "object"
            ? JSON.stringify(timeout)
            : timeout.toString() + "ms"
        }ms`
      );
  }
}
