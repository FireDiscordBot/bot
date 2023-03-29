import { Inhibitor as AkairoInhibitor, InhibitorOptions } from "discord-akairo";
import { Fire } from "@fire/lib/Fire";
import { FireMessage } from "../extensions/message";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { Command } from "./command";

export class Inhibitor extends AkairoInhibitor {
  declare client: Fire;

  constructor(id: string, options?: InhibitorOptions) {
    super(id, options);
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}

  // @ts-ignore
  async exec(
    message: FireMessage | ApplicationCommandMessage,
    command?: Command
  ) {
    return false;
  }
}
