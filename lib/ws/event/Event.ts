import { Manager } from "../../Manager";

export class Event {
  client: Manager;
  name: number;

  constructor(client: Manager, name: number) {
    this.client = client;
    this.name = name;
  }

  run(data: any) {
    throw new SyntaxError("This should be overwritten in the actual event!");
  }
}
