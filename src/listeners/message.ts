import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import Sk1er from "../modules/sk1er";

export default class Message extends Listener {
  constructor() {
    super("message", {
      emitter: "client",
      event: "message",
    });
  }

  async exec(message: FireMessage) {
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    // These won't run if the module isn't loaded
    await sk1erModule?.checkLogs(message).catch(() => {});
    await sk1erModule?.checkBotStatus(message).catch(() => {});
  }
}
