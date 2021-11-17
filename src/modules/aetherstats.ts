import { Collection } from "@discordjs/collection";
import { Module } from "@fire/lib/util/module";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";

export default class AetherStats extends Module {
  sessionGatewayEvents: Collection<number, Collection<string, number>>; // per session stats
  gatewayEvents: Collection<number, Collection<string, number>>; // filled with data from influx by aether on launch
  statsTask: NodeJS.Timeout;

  constructor() {
    super("aetherstats");
    this.gatewayEvents = new Collection();
    this.sessionGatewayEvents = new Collection();
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
    this.client.influx([
      ...this.gatewayEvents.map((events, shard) => ({
        measurement: "gateway_events",
        tags: {
          cluster: this.client.manager.id.toString(),
          shard: shard.toString(),
        },
        fields: Object.fromEntries(events.entries()),
      })),
      ...this.sessionGatewayEvents.map((events, shard) => ({
        measurement: "gateway_events_session",
        tags: {
          cluster: this.client.manager.id.toString(),
          shard: shard.toString(),
          session: this.client.manager.session,
        },
        fields: Object.fromEntries(events.entries()),
      })),
      {
        measurement: "gateway_events_count",
        fields: {
          total: this.gatewayEvents
            .map((events) => events.toJSON())
            .flat()
            .reduce((a, b) => a + b, 0),
          session: this.sessionGatewayEvents
            .map((events) => events.toJSON())
            .flat()
            .reduce((a, b) => a + b, 0),
        },
      },
    ]);
  }
}
