import { Manager } from "../../Manager";
import { readdirSync } from "fs";
import { join } from "path";

const { Collection } = require("discord.js");

export class EventStore extends Collection {
  client: Manager;

  constructor(client: Manager) {
    super();
    this.client = client;
  }

  init() {
    const events = readdirSync(join(process.cwd(), "/src/ws/events"));
    for (const event of events) {
      const Event = require(join(process.cwd(), "/src/ws/events/", event));
      const instance = new Event(this.client);
      this.set(instance.name, instance);
    }
  }
}
