import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { PresenceStatusData } from "discord.js";

export default class AliasSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SET_CUSTOM_STATUS);
  }

  async run(
    data:
      | {
          since: number;
          state: string;
          status: PresenceStatusData;
          shardIds: number[];
        }
      | { reset: true }
  ) {
    if ("reset" in data) return this.manager.client.setReadyPresence();
    this.manager.client.setCustomStatus(
      data.since,
      data.state,
      data.status,
      data.shardIds
    );
  }
}
