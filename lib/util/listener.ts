import { Fire } from "@fire/lib/Fire";
import { Listener as AkairoListener, ListenerOptions } from "discord-akairo";

export class Listener extends AkairoListener {
  declare client: Fire;

  constructor(id: string, options?: ListenerOptions) {
    super(id, options);
  }

  async init(): Promise<any> {}
}
