import { Inhibitor as AkairoInhibitor, InhibitorOptions } from "discord-akairo";
import { Fire } from "@fire/lib/Fire";

export class Inhibitor extends AkairoInhibitor {
  declare client: Fire;

  constructor(id: string, options?: InhibitorOptions) {
    super(id, options);
  }

  async init() {}

  async unload() {}
}
