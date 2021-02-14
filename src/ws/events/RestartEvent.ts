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

  async run(data: { shardCount: number; shards: number[] }) {
    this.manager.client.console.log(
      "[Aether] Received restart event, checking whether sharding options have changed..."
    );
    const currentOptions = this.manager.client.options;
    if (
      currentOptions.shardCount == data.shardCount &&
      JSON.stringify(currentOptions.shards) == JSON.stringify(data.shards)
    ) {
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
