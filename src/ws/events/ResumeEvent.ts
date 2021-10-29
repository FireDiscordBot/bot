import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class ResumeEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESUME_CLIENT);
  }

  async run(data: { replayed: number }) {
    this.manager.ready = true;
    this.manager.client.console.log(
      data.replayed
        ? `[Aether] Sucessfully resumed session ${this.manager.session} with ${data.replayed} replayed events.`
        : `[Aether] Sucessfully resumed session ${this.manager.session}.`
    );
  }
}
