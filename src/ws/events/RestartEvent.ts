import { Manager } from "@fire/lib/Manager";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { ManagerState } from "@fire/lib/interfaces/aether";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import AetherStats from "@fire/src/modules/aetherstats";

export default class Restart extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESTART_CLIENT);
  }

  async run(data: {
    events: Record<string, Record<string, number>>;
    state: ManagerState;
    shardCount: number;
    interval: number;
    shards: number[];
    session: string;
    force: boolean;
    id: number;
  }) {
    this.console.log(
      "Received restart event, checking whether sharding options have changed..."
    );
    if (data.id != this.manager.id)
      return this.manager.kill("cluster_id_mismatch");
    const currentOptions = this.manager.client.options;
    if (
      currentOptions.shardCount != data.shardCount ||
      !data.shards.every((shard) => this.manager.client.ws.shards.has(shard)) ||
      !this.manager.client.ws.shards.every((_, shard) =>
        data.shards.includes(shard)
      )
    )
      return await this.manager.kill("resharding");

    // we need to force fetch to get certain properties (e.g. banner)
    await this.manager.client.user.fetch().catch(() => {});

    for (const [id, guild] of this.manager.client.guilds.cache) {
      const member = guild.members.me as FireMember;
      this.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.GUILD_CREATE, {
            id,
            name: guild.name,
            icon: guild.icon,
            vanity: guild.vanityURLCode,
            member: member.toAPIMemberJSON(),
          })
        )
      );
    }
    this.manager.session = data.session;
    this.manager.state = data.state;
    this.manager.ws.heartbeatInterval = data.interval;
    this.manager.ws.startHeartbeat();
    const aetherstats = this.manager.client.getModule(
      "aetherstats"
    ) as AetherStats;
    aetherstats.events = data.events;
    this.manager.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.READY_CLIENT, {
          avatar: this.manager.client.user.displayAvatarURL({
            size: 4096,
          }),
          allCommands: getAllCommands(this.manager.client),
          commands: getCommands(this.manager.client),
          name: this.manager.client.user.username,
          id: this.manager.client.manager.id,
          env: process.env.NODE_ENV,
          commit: this.manager.commit,
          uuid:
            process.env.pm_id ??
            this.manager.client.util.randInt(0, 65535).toString(),
        })
      )
    );
    this.manager.ws?.send(
      MessageUtil.encode(
        new Message(
          EventType.DISCOVERY_UPDATE,
          this.manager.client.util.getDiscoverableGuilds()
        )
      )
    );
    this.manager.ws?.send(
      MessageUtil.encode(
        new Message(
          EventType.REFRESH_COMMANDS,
          this.manager.client.util.getCommandsV2()
        )
      )
    );

    let item: ReturnType<Manager["influxQueue"]["shift"]>;
    if (this.manager.influxQueue.length) {
      while ((item = this.manager.influxQueue.shift()))
        this.manager.writeToInflux(item.points, item.options);
    }

    return (this.manager.ready = true);
  }
}
