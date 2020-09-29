import { Manager } from "../../Manager";

export class Event {
  manager: Manager;
  name: number;

  constructor(manager: Manager, name: number) {
    this.manager = manager;
    this.name = name;
  }

  run(data: any) {
    throw new SyntaxError("This should be overwritten in the actual event!");
  }
}
