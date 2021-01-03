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
    this.client.console.warn(
      `[Rest] Limited on route ${route} while trying to ${method.toUpperCase()} with limit ${limit}, waiting for timeout of ${timeout}ms`
    );
  }
}
