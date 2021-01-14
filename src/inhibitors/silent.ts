import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";
import { Command } from "../../lib/util/command";

export default class SilentInhibitor extends Inhibitor {
  constructor() {
    super("silent", {
      reason: "silent",
      priority: 2,
    });
  }

  async exec(message: FireMessage, command?: Command) {
    if (command.id != "quote" && message.silent) await message.delete();
    return false;
  }
}
