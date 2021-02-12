import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";

export default class CommandFinished extends Listener {
  constructor() {
    super("commandFinished", {
      emitter: "commandHandler",
      event: "commandFinished",
    });
  }

  async exec(message: FireMessage) {
    // member cache sweep ignores members with
    // an active command util so once the command
    // finishes, we can dispose of the command util
    this.client.commandHandler.commandUtils.delete(message.id);
  }
}
