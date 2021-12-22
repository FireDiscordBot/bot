import { ManagerState } from "@fire/lib/interfaces/aether";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class UpdateStateEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_STATE);
  }

  async run(data: ManagerState) {
    this.manager.state = data;
  }
}
