import { Manager } from "../../Manager";
import { readdirSync } from "fs";
import { join } from "path";
import { Collection } from "discord.js";
import { Event } from "./Event";

export class EventStore extends Collection<string, Event> {
  manager: Manager;

  constructor(manager: Manager) {
    super();
    this.manager = manager;
  }

  init() {
    const events = readdirSync(join(process.cwd(), "/src/ws/events"));
    for (const event of events) {
      const Event = require(join(process.cwd(), "/src/ws/events/", event));
      const instance = new Event(this.manager);
      this.set(instance.name, instance);
    }
  }
}
