import { EventType } from "@fire/lib/ws/util/constants";
import { FireUser } from "@fire/lib/extensions/user";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class ApplyExperimentEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.APPLY_EXPERIMENT);
  }

  async run(data: { user: string; experiment: string; treatment: number }) {
    let user = this.manager.client.users.cache.get(data.user) as FireUser;
    if (!user)
      user = (await this.manager.client.users
        .fetch(data.user)
        .catch(() => {})) as FireUser;
    if (!user) return;
    this.manager.client.console.log(
      `[Aether] Received request to apply experiment ${data.experiment} for ${user} (${user.id}).`
    );
    user.giveExperiment(data.experiment, data.treatment);
  }
}
