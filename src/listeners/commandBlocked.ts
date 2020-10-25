import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { Command } from "../../lib/util/command";

export default class CommandBlocked extends Listener {
  constructor() {
    super("commandBlocked", {
      emitter: "commandHandler",
      event: "commandBlocked",
    });
  }

  async exec(message: FireMessage, command: Command, reason: string) {
    if (reason == "owner") return await message.error("COMMAND_OWNER_ONLY");
    else if (reason == "premium")
      return await message.error("COMMAND_PREMIUM_ONLY");
  }
}
