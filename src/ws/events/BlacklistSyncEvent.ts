import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import Blacklist from "@fire/src/inhibitors/blacklist";
import { Snowflake } from "discord-api-types/globals";

export default class BlacklistSync extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.BLACKLIST_SYNC);
  }

  async run(data: { user: Snowflake; action: "blacklist" | "unblacklist" }) {
    this.console.log(
      `Received blacklist sync request for ${
        this.manager.client.users.cache.get(data.user) || data.user
      }.`
    );

    if (!this.manager.client.util.loadedData.plonked) {
      const blacklist = this.manager.client.getInhibitor(
        "blacklist"
      ) as Blacklist;
      await blacklist.loadBlacklist();
    }

    if (data.action == "blacklist")
      this.manager.client.util.plonked.push(data.user);
    else if (data.action == "unblacklist")
      this.manager.client.util.plonked =
        this.manager.client.util.plonked.filter((user) => user != data.user);
  }
}
