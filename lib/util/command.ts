import {
  ArgumentGenerator as AkairoArgumentGenerator,
  ArgumentOptions as AkairoArgumentOptions,
  Command as AkairoCommand,
  CommandOptions as AkairoCommandOptions,
  Flag,
} from "discord-akairo";
import { Fire } from "../Fire";

type ArgumentGenerator = (
  ...a: Parameters<AkairoArgumentGenerator>
) => IterableIterator<ArgumentOptions | Flag>;

export class Command extends AkairoCommand {
  client: Fire;
  hidden: boolean;
  premium: boolean;
  args?: ArgumentOptions[] | ArgumentGenerator;

  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases) options.aliases = [id];
    else options?.aliases?.push(id);
    if (options.args instanceof Array && options.args.length == 1)
      options.args[0].match = "rest";
    super(id, options);
    this.hidden = options.hidden || false;
    if (this.ownerOnly) this.hidden = true;
    this.premium = options.premium || false;
    this.args = options.args;
  }

  async init() {}

  async unload() {}
}

export interface CommandOptions extends AkairoCommandOptions {
  hidden?: boolean;
  premium?: boolean;
  args?: ArgumentOptions[] | ArgumentGenerator;
}

export interface ArgumentOptions extends AkairoArgumentOptions {
  required?: boolean;
}
