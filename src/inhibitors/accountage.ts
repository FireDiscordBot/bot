import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class AccountAgeInhibitor extends Inhibitor {
  constructor() {
    super("accountage", {
      reason: "accountage",
      priority: 4,
    });
  }

  exec(message: FireMessage) {
    const date = new Date().getDate() + 1;
    const tomorrow = new Date();
    tomorrow.setDate(date);
    if (message.author.createdAt < tomorrow) return true;
    return false;
  }
}
