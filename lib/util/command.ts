import {
  Command as AkairoCommand,
  CommandOptions as AkairoOptions,
} from "discord-akairo";
import { Fire } from "../Fire";

export class Command extends AkairoCommand {
  client: Fire;
  hidden: boolean;
  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases) options.aliases = [id];
    else options?.aliases?.push(id);
    super(id, options);
    this.hidden = options.hidden || false;
  }

  async init() {}

  async unload() {}
}

interface CommandOptions extends AkairoOptions {
  hidden?: boolean;
}
