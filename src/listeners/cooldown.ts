import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { Command } from "../../lib/util/command";
import { humanize } from "../../lib/util/constants";

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
