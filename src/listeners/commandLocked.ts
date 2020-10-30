import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { Command } from "../../lib/util/command";

export default class CommandLocked extends Listener {
  constructor() {
    super("commandLocked", {
      emitter: "commandHandler",
      event: "commandLocked",
    });
  }

  async exec(message: FireMessage, command: Command) {
    return await message.error("COMMAND_ERROR_CONCURRENCY");
  }
}
