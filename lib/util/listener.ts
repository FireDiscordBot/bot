import { Listener as AkairoListener, ListenerOptions } from "discord-akairo";
import { Fire } from "../Fire";

export class Listener extends AkairoListener {
  client: Fire;
  constructor(id: string, options?: ListenerOptions) {
    super(id, options);
  }

  async init(): Promise<any> {}
}
