import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import MCLogs, { MinecraftVersion } from "@fire/src/modules/mclogs";

export default class UpdateBGS extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_BLOCKGAMESOLUTIONS);
  }

  async run(data: {
    versions: {
      [version: MinecraftVersion]: {
        solutions: { [key: string]: string };
        recommendations: { [key: string]: string };
      };
    };
    solutions: { [key: string]: string };
    recommendations: { [key: string]: string };
    cheats: string[];
  }) {
    this.console.warn(`Got request to update solutions`);
    const mcLogs = this.manager.client.getModule("mclogs") as MCLogs;
    if (!mcLogs) return;
    if (!("solutions" in data) || Object.keys(data.solutions)?.length < 5) {
      this.console.error(
        `Solutions were missing or less than 5, something likely went wrong so they were not updated.`
      );
      return;
    }
    mcLogs.bgs = data;
  }
}
