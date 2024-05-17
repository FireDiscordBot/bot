import { Manager } from "@fire/lib/Manager";
import { Collection } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { Event } from "./Event";

export class EventStore extends Collection<number, Event> {
  manager: Manager;

  constructor(manager: Manager) {
    super();
    this.manager = manager;
  }

  init() {
    const eventsFolder = this.manager.isDist
      ? "/dist/src/ws/events/"
      : "/src/ws/events/";
    const files = readdirSync(join(process.cwd(), eventsFolder));
    for (const file of files) {
      if (file.includes(".map")) continue;
      const eventModule = require(join(process.cwd(), eventsFolder, file));
      const eventClass = eventModule.default;
      const instance: Event = new eventClass(this.manager);
      this.set(instance.name, instance);
    }
  }
}
