import { Listener } from "@fire/lib/util/listener";
import ChannelUpdate from "./channelUpdate";
import { ThreadChannel } from "discord.js";

export default class ThreadUpdate extends Listener {
  constructor() {
    super("threadUpdate", {
      emitter: "client",
      event: "threadUpdate",
    });
  }

  async exec(before: ThreadChannel, after: ThreadChannel) {
    const channelListener = this.client.getListener(
      "channelUpdate"
    ) as ChannelUpdate;
    if (!channelListener) return; // should realistically never happen but who knows

    await channelListener.exec(before, after);
  }
}
