import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class SubscribeUser extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SUBSCRIBE_USER);
  }

  async run(data: { id: Snowflake }) {
    if (!this.manager.state.subscribed.includes(data.id))
      this.manager.state.subscribed.push(data.id);
  }
}
