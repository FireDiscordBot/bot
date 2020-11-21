import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class ReloadExperimentsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RELOAD_EXPERIMENTS);
  }

  run(data: {}) {
    this.manager.client.console.log(
      "[Aether] Received request to reload experiments."
    );
    this.manager.client.loadExperiments();
  }
}
