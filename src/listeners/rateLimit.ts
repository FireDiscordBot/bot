import { Listener } from "../../lib/util/listener";

export default class RateLimit extends Listener {
  constructor() {
    super("rateLimit", {
      emitter: "client",
      event: "rateLimit",
    });
  }

  async exec(
    timeout: number,
    limit: number,
    method: string,
    path: string,
    route: string
  ) {
    if (!route)
      this.client.console.warn(
        `[Rest] Limited on an unknown route, with timeout ${
          typeof timeout == "object"
            ? JSON.stringify(timeout)
            : timeout.toString() + "ms"
        }`
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
