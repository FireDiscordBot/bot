import { Listener as AkairoListener, ListenerOptions } from "discord-akairo";
import { Fire } from "@fire/lib/Fire";

export class Listener extends AkairoListener {
  declare client: Fire;

  constructor(id: string, options?: ListenerOptions) {
    super(id, options);
  }

  async init(): Promise<any> {}
}
