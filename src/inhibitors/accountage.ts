import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";
import * as moment from "moment";

export default class AccountAgeInhibitor extends Inhibitor {
  constructor() {
    super("accountage", {
      reason: "accountage",
      priority: 4,
    });
  }

  exec(message: FireMessage, command: Command) {
    if (
      moment(new Date()).diff(message.author.createdAt) < 86400000 &&
      command.id != "debug"
    )
      return true;
    return false;
  }
}
