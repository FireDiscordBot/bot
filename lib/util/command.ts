import { Command as AkairoCommand, CommandOptions } from "discord-akairo";
import { Fire } from "../Fire";

export class Command extends AkairoCommand {
  client: Fire;
  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases) options.aliases = [id];
    else options?.aliases?.push(id);
    super(id, options);
  }

  async init() {}

  async unload() {}
}
