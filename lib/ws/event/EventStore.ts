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
    const path = this.client.client.config.dev
      ? "/src/ws/events/"
      : "/dist/src/ws/events/";
    const events = readdirSync(join(process.cwd(), path));
    for (const e of events) {
      const event = require(join(process.cwd(), path, e));
      const instance = new event.default(this.client);
      this.set(instance.name, instance);
    }
  }
}
