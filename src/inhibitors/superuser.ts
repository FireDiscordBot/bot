import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class SuperuserInhibitor extends Inhibitor {
  constructor() {
    super("superuser", {
      reason: "superuser",
      type: "post",
      priority: 8,
    });
  }

  async exec(message: FireMessage, command?: Command) {
    return command?.superuserOnly && !message.author.isSuperuser();
  }
}
