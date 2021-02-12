import { Experiment } from "@fire/lib/interfaces/experiments";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";
import { Collection } from "discord.js";

export default class ReloadExperimentsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RELOAD_EXPERIMENTS);
  }

  run(data: { [id: string]: Experiment }) {
    this.manager.client.console.log(
      "[Aether] Received request to reload experiments."
    );
    this.manager.client.experiments = new Collection();
    for (const experiment of Object.values(data))
      this.manager.client.experiments.set(experiment.id, experiment);
  }
}
