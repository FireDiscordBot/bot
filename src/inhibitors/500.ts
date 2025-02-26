import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class InternalServerError extends Inhibitor {
  constructor() {
    super("500", {
      reason: "500",
      priority: 10,
    });
  }

  // Some checks for things that will almost certainly cause issues
  async exec() {
    if (!this.client.db || this.client.db.closed) return true;
    return false;
  }
}
