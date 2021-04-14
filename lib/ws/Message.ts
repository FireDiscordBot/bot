import { EventType } from "./util/constants";

export class Message {
  type: EventType;
  nonce?: string;
  data: unknown;

  constructor(type: EventType, data: unknown, nonce?: string) {
    this.nonce = nonce;
    this.type = type;
    this.data = data;
  }

  toJSON() {
    return {
      op: this.type,
      d: this.data,
      n: this.nonce,
    };
  }
}
