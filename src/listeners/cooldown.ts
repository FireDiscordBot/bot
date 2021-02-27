import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";

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
