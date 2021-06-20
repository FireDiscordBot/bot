import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";
import { Command } from "@fire/lib/util/command";

export default class ExperimentLockInhibitor extends Inhibitor {
  constructor() {
    super("experimentlock", {
      reason: "experimentlock",
      type: "post",
      priority: 4,
    });
  }

  exec(message: FireMessage, command: Command) {
    if (!command) return;
    const requiresExperiment = command.requiresExperiment;
    if (requiresExperiment) {
      const experiment = this.client.experiments.get(requiresExperiment.id);
      if (!experiment) return true;
      else if (!message.hasExperiment(experiment.id, requiresExperiment.bucket))
        return true;
    }

    return false;
  }
}
