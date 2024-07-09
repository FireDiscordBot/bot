import { Module } from "@fire/lib/util/module";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";

export default class AetherStats extends Module {
  events: Record<string, Record<string, number>> = {};
  statsTask: NodeJS.Timeout;
  eventsTask: NodeJS.Timeout;

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
    this.eventsTask = setInterval(() => {
      this.writeEvents();
    }, 60000);
  }

  async unload() {
    if (this.statsTask) clearInterval(this.statsTask);
  }

  async sendStats() {
    if (!this.client.manager.ws?.open) return;
    await this.client.waitUntilReady();
    const stats = await this.client.util.getClusterStats();
    this.client.manager.ws.send(
      MessageUtil.encode(new Message(EventType.SEND_STATS, stats))
    );
  }

  async writeEvents() {
    if (!this.client.manager.ws?.open) return;
    this.client.writeToInflux([
      ...Object.entries(this.events)
        .map(([shard, events]) => {
          return Object.entries(events).map(([eventType, count]) => ({
            measurement: "gateway_events",
            fields: { count },
            tags: { eventType, shard },
          }));
        })
        .flat(),
      ...Object.entries(this.events).map(([shard, events]) => ({
        measurement: "gateway_events_total",
        fields: { count: Object.values(events).reduce((a, b) => a + b) },
        tags: { shard },
      })),
    ]);
  }
}
