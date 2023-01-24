import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";
import { Snowflake } from "discord.js";

export default class AliasSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.ALIAS_SYNC);
  }

  async run(data: { user: Snowflake; aliases: string[] }) {
    this.manager.client.aliases.set(data.user, data.aliases);
  }
}
