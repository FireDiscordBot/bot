import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class PremiumSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PREMIUM_SYNC);
  }

  run(data: { guild_id: string; user_id: string; action: "add" | "remove" }) {
    this.manager.client.console.log(
      `[Event] Received premium sync request for ${
        this.manager.client.guilds.cache.get(data.guild_id) || data.guild_id
      }.`
    );
    if (data.action == "remove")
      this.manager.client.util.premium.delete(data.guild_id);
    else this.manager.client.util.premium.set(data.guild_id, data.user_id);
  }
}
