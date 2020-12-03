import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class ExperimentLockInhibitor extends Inhibitor {
  constructor() {
    super("experimentlock", {
      reason: "experimentlock",
      priority: 4,
    });
  }

  exec(message: FireMessage) {
    const command = message.util?.parsed?.command;
    const requiresExperiment = command.requiresExperiment;
    if (requiresExperiment) {
      const experiment = this.client.experiments.get(requiresExperiment.id);
      if (!experiment) return true;
      else if (
        experiment.kind == "user" &&
        !message.author.hasExperiment(
          experiment.id,
          requiresExperiment.treatmentId
        )
      )
        return true;
      else if (
        experiment.kind == "guild" &&
        !message.guild?.hasExperiment(
          experiment.id,
          requiresExperiment.treatmentId
        )
      )
        return true;
    }

    return false;
  }
}
