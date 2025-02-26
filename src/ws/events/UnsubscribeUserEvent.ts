import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";

export default class UnsubscribeUser extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UNSUBSCRIBE_USER);
  }

  async run(data: { id: string }) {
    if (!this.manager.ws?.subscribed?.includes(data.id)) return;
    this.manager.ws.subscribed = this.manager.ws.subscribed.filter(
      (id) => id != data.id
    );
  }
}
