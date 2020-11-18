import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class BlacklistSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.BLACKLIST_SYNC);
  }

  run(data: { user: string; action: "blacklist" | "unblacklist" }) {
    this.manager.client.console.log(
      `[Event] Received blacklist sync request for ${
        this.manager.client.users.cache.get(data.user) || data.user
      }.`
    );
    if (data.action == "blacklist")
      this.manager.client.util.plonked.push(data.user);
    else if (data.action == "unblacklist")
      this.manager.client.util.plonked = this.manager.client.util.plonked.filter(
        (user) => user != data.user
      );
  }
}
