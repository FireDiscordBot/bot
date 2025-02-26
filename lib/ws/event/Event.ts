import { Manager } from "@fire/lib/Manager";

export class Event {
  manager: Manager;
  name: number;

  constructor(manager: Manager, name: number) {
    this.manager = manager;
    this.name = name;
  }

  get console() {
    return this.manager.getLogger(`Event:${this.constructor.name}`);
  }

  async run(data: any, nonce?: string): Promise<any> {
    throw new SyntaxError("This should be overwritten in the actual event!");
  }
}
