import { Experiment } from "@fire/lib/interfaces/experiments";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class ReloadExperimentsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RELOAD_EXPERIMENTS);
  }

  async run(experiments: Experiment[]) {
    this.manager.client.console.log(
      "[Aether] Received request to reload experiments."
    );
    for (const experiment of experiments)
      this.manager.client.experiments.set(experiment.hash, experiment);
  }
}
