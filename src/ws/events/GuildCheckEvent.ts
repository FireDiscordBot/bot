import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";

export default class GuildCheckEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.GUILD_CHECK);
  }

  run(data: { id: string }, nonce: string) {
    this.manager.ws.send(
      MessageUtil.encode(
        new Message(
          EventType.GUILD_CHECK,
          {
            id: data.id,
            has: this.manager.client?.guilds.cache.has(data.id),
          },
          nonce
        )
      )
    );
  }
}
