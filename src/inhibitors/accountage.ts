import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class AccountAge extends Inhibitor {
  constructor() {
    super("accountage", {
      reason: "accountage",
      type: "post",
      priority: 4,
    });
  }

  async exec(message: FireMessage, command?: Command) {
    if (process.env.NODE_ENV == "development") return false;
    if (
      +new Date() - message.author.createdTimestamp < 86400000 &&
      command?.id != "debug"
    )
      return true;
    return false;
  }
}
