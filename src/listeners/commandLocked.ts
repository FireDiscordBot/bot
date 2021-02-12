import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";

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
