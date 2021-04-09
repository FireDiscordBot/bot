import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";

export default class RestartEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESTART_CLIENT);
  }

  async run(data: {
    id: number;
    session: string;
    shardCount: number;
    shards: number[];
  }) {
    this.manager.launched = true;
    this.manager.client.console.log(
      "[Aether] Received restart event, checking whether sharding options have changed..."
    );
    if (data.id != this.manager.id) return this.manager.kill("resharding");
    this.manager.session = data.session;
    const currentOptions = this.manager.client.options;
    if (
      currentOptions.shardCount == data.shardCount &&
      (currentOptions.shards as number[]).every((shard) =>
        data.shards.includes(shard)
      )
    ) {
      for (const [guild] of this.manager.client.guilds.cache)
        this.manager.ws.send(
          MessageUtil.encode(new Message(EventType.GUILD_CREATE, { id: guild }))
        );
      this.manager.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.READY_CLIENT, {
            id: this.manager.client.manager.id,
            commands: getCommands(this.manager.client),
            allCommands: getAllCommands(this.manager.client),
            avatar: this.manager.client.user.displayAvatarURL({
              size: 4096,
            }),
          })
        )
      );
      return;
    }
    this.manager.kill("resharding");
  }
}
