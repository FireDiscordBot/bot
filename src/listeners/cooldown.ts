import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { humanize } from "@fire/lib/util/constants";

export default class Cooldown extends Listener {
  constructor() {
    super("cooldown", {
      emitter: "commandHandler",
      event: "cooldown",
    });
  }

  async exec(message: FireMessage) {
    return await message.error("COMMAND_ERROR_COOLDOWN");
  }
}
