import { getAllCommands, getCommands } from "../../../lib/util/commandutil";
import { MessageUtil } from "../../../lib/ws/util/MessageUtil";
import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Message } from "../../../lib/ws/Message";
import { Manager } from "../../../lib/Manager";

export default class RestartEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESTART_CLIENT);
  }

  run(data: { shardCount: number; shards: number[] }) {
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
    this.manager.relaunch(data || { shardCount: 1, shards: [0] });
  }
}
