import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class PremiumSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.PREMIUM_SYNC);
  }

  run(data: { guilds: string[]; user_id: string; action: "add" | "remove" }) {
    this.manager.client.console.log(
      `[Event] Received premium sync request for ${data.guilds.join(", ")}.`
    );
    for (const guild of data.guilds)
      if (data.action == "remove")
        this.manager.client.util.premium.delete(guild);
      else this.manager.client.util.premium.set(guild, data.user_id);
  }
}
