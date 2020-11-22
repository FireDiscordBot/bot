import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import * as moment from "moment";

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
    if (moment(tomorrow).diff(message.author.createdAt) > 86400000) return true;
    return false;
  }
}
