import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { ThreadChannel } from "discord.js";

export default class Thread extends Inhibitor {
  constructor() {
    super("thread", {
      reason: "thread",
    });
  }

  async exec(message: FireMessage) {
    if (message.channel instanceof ThreadChannel) {
      const checks = await this.client.commandHandler
        .preThreadChecks(message)
        .catch(() => {});
      if (!checks) return;
    }
    return false;
  }
}
