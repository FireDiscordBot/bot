import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Module } from "@fire/lib/util/module";
import { Message } from "@fire/lib/ws/Message";

export default class AetherStats extends Module {
  statsTask: NodeJS.Timeout;
  constructor() {
    super("aetherstats");
  }

  async init() {
    if (!this.client.manager.ws) return;
    if (this.statsTask) clearInterval(this.statsTask);
    await this.sendStats();
    this.statsTask = setInterval(() => {
      this.sendStats();
    }, 5000);
  }

  async unload() {
    if (this.statsTask) clearInterval(this.statsTask);
  }

  async sendStats() {
    if (!this.client.manager.ws?.open) return;
    const stats = await this.client.util.getClusterStats();
    this.client.manager.ws.send(
      MessageUtil.encode(new Message(EventType.SEND_STATS, stats))
    );
  }
}
