import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";

export default class SuperuserInhibitor extends Inhibitor {
  constructor() {
    super("superuser", {
      reason: "superuser",
      priority: 8,
    });
  }

  exec(message: FireMessage, command?: Command) {
    return command?.superuserOnly && !message.author.isSuperuser();
  }
}
