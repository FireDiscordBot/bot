import { Manager } from "../../Manager";

export class Event {
  client: Manager;
  name;

  constructor(client: Manager, name) {
    this.client = client;
    this.name = name;
  }

  run(data) {
    throw new SyntaxError("This should be overwritten in the actual event!");
  }
}
