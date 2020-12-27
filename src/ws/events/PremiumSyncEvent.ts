import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class PremiumSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PREMIUM_SYNC);
  }

  run(data: { id: string; action: "add" | "remove" }) {
    this.manager.client.console.log(
      `[Event] Received premium sync request for ${
        this.manager.client.guilds.cache.get(data.id) || data.id
      }.`
    );
    this.manager.client.getInhibitor("premium").init();
  }
}
