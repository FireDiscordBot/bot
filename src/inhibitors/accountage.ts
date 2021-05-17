import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";
import * as moment from "moment";

export default class AccountAgeInhibitor extends Inhibitor {
  constructor() {
    super("accountage", {
      reason: "accountage",
      type: "post",
      priority: 4,
    });
  }

  exec(message: FireMessage, command?: Command) {
    if (process.env.NODE_ENV == "development") return false;
    if (
      moment(new Date()).diff(message.author.createdAt) < 86400000 &&
      command?.id != "debug"
    )
      return true;
    return false;
  }
}
