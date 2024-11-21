import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class BlacklistSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.BLACKLIST_SYNC);
  }

  async run(data: { user: Snowflake; action: "blacklist" | "unblacklist" }) {
    this.manager.client.console.log(
      `[Event] Received blacklist sync request for ${
        this.manager.client.users.cache.get(data.user) || data.user
      }.`
    );
    if (data.action == "blacklist")
      this.manager.client.util.plonked.push(data.user);
    else if (data.action == "unblacklist")
      this.manager.client.util.plonked =
        this.manager.client.util.plonked.filter((user) => user != data.user);
  }
}
