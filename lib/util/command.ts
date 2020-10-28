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
    if (options.args instanceof Array)
      options.args.forEach((arg) => {
        if (!arg.readableType && arg.type)
          arg.readableType = arg.type.toString();
      });
    if (!options.restrictTo) options.channel = "guild";
    else if (options.restrictTo != "all") options.channel = options.restrictTo;
    super(id, options);
    this.hidden = options.hidden || false;
    if (this.ownerOnly) this.hidden = true;
    this.premium = options.premium || false;
    this.args = options.args;
  }

  async init() {}

  async unload() {}

  getArgumentsClean() {
    return typeof this.args !== "undefined" && Array.isArray(this.args)
      ? this.args.map((argument) => {
          if (argument.required) {
            if (argument.flag)
              return argument.type
                ? `<${argument.flag} ${argument.readableType}>`
                : `<${argument.flag}>`;
            else return `<${argument.readableType}>`;
          } else {
            if (argument.flag)
              return argument.type
                ? `[<${argument.flag} ${argument.readableType}>]`
                : `[<${argument.flag}>]`;
            else return `[<${argument.readableType}>]`;
          }
        })
      : [];
  }
}

export interface CommandOptions extends AkairoCommandOptions {
  hidden?: boolean;
  premium?: boolean;
  args?: ArgumentOptions[] | ArgumentGenerator;
  restrictTo?: "guild" | "dm" | "all";
}

export interface ArgumentOptions extends AkairoArgumentOptions {
  required?: boolean;
  readableType?: string;
}
