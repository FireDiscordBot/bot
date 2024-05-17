import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Listener } from "@fire/lib/util/listener";

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
