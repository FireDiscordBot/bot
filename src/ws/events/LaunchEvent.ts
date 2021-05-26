import {
  GuildExperimentConfig,
  UserExperimentConfig,
} from "@fire/lib/interfaces/aether";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class LaunchEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LAUNCH_CLIENT);
  }

  run(data: {
    guildExperiments: GuildExperimentConfig[];
    userExperiments: UserExperimentConfig[];
    shardCount: number;
    shards: number[];
    session: string;
    id: number;
  }) {
    this.manager.client.console.log(
      `[Aether] Received launch event with cluster id ${data.id}.`
    );
    if (data.guildExperiments)
      this.manager.state.loadedGuildExperiments = data.guildExperiments;
    if (data.userExperiments)
      this.manager.state.loadedUserExperiments = data.userExperiments;
    this.manager.launch(
      data || { id: 0, session: "", shardCount: 1, shards: [0] }
    );
  }
}
