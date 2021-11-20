import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";
import MCLogs from "@fire/src/modules/mclogs";

export default class UpdateSolutionsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_SOLUTIONS);
  }

  async run(data: {
    solutions: { [key: string]: string };
    recommendations: { [key: string]: string };
    cheats: string[];
  }) {
    this.manager.client.console.warn(
      `[Aether] Got request to update solutions`
    );
    const mcLogs = this.manager.client.getModule("mclogs") as MCLogs;
    if (!mcLogs) return;
    if (Object.keys(data.solutions).length < 5) {
      this.manager.client.console.error(
        `[Aether] Solutions keys were less than 5, something likely went wrong`
      );
      return;
    }
    mcLogs.solutions = data;
  }
}
