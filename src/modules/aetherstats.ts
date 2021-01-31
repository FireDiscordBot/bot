import { MessageUtil } from "../../lib/ws/util/MessageUtil";
import { EventType } from "../../lib/ws/util/constants";
import { FireGuild } from "../../lib/extensions/guild";
import { Module } from "../../lib/util/module";
import { Message } from "../../lib/ws/Message";

export default class AetherStats extends Module {
  statsTask: NodeJS.Timeout;
  constructor() {
    super("aetherstats");
  }

  async init() {
    if (!this.client.manager.ws) return;
    await this.sendStats();
    this.statsTask = setInterval(() => {
      this.sendStats();
    }, 5000);
  }

  async unload() {
    if (this.statsTask) clearInterval(this.statsTask);
  }

  async sendStats() {
    if (this.client.manager.ws?.readyState != this.client.manager.ws?.OPEN)
      return;
    const stats = await this.client.util.getClusterStats();
    this.client.manager.ws.send(
      MessageUtil.encode(new Message(EventType.SEND_STATS, stats))
    );
    for (const [, guild] of this.client.guilds.cache.filter(
      (guild: FireGuild) => !!guild.roleUpdateLogs
    ))
      (guild as FireGuild).roleUpdateLogs = 0;
  }
}
