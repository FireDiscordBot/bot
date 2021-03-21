import { EventType } from "./util/constants";

export class Message {
  type: EventType;
  data: unknown;

  constructor(type: EventType, data: unknown) {
    this.type = type;
    this.data = data;
  }

  toJSON() {
    return {
      op: this.type,
      d: this.data,
    };
  }
}
