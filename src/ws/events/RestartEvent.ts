import { FireMember } from "@fire/lib/extensions/guildmember";
import { ManagerState } from "@fire/lib/interfaces/aether";
import { Manager } from "@fire/lib/Manager";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { getCommitHash } from "@fire/lib/util/gitUtils";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import GuildCheckEvent from "./GuildCheckEvent";

export default class RestartEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESTART_CLIENT);
  }

  async run(data: {
    state: ManagerState;
    shardCount: number;
    interval: number;
    shards: number[];
    session: string;
    id: number;
  }) {
    this.manager.client.console.log(
      "[Aether] Received restart event, checking whether sharding options have changed..."
    );
    if (data.id != this.manager.id)
      return this.manager.kill("cluster_id_mismatch");
    const currentOptions = this.manager.client.options;
    if (
      currentOptions.shardCount != data.shardCount &&
      !(currentOptions.shards as number[]).every((shard) =>
        data.shards.includes(shard)
      )
    )
      this.manager.kill("resharding");
    for (const [id, guild] of this.manager.client.guilds.cache)
      this.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.GUILD_CREATE, {
            id,
            member: GuildCheckEvent.getMemberJSON(guild.me as FireMember),
          })
        )
      );
    this.manager.session = data.session;
    this.manager.state = data.state;
    this.manager.ws.heartbeatInterval = data.interval;
    this.manager.ws.startHeartbeat();
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
          commit: getCommitHash(),
          uuid: process.env.pm_id,
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
    return (this.manager.ready = true);
  }
}
