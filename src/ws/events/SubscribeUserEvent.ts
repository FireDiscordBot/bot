import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class SubscribeUserEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SUBSCRIBE_USER);
  }

  async run(data: { id: string }) {
    if (!this.manager.ws?.subscribed.includes(data.id))
      this.manager.ws.subscribed.push(data.id);
  }
}
