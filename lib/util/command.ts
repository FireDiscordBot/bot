import {
  AkairoModuleOptions,
  ArgumentGenerator,
  ArgumentOptions as ArgOptions,
  BeforeAction,
  Command as AkairoCommand,
  DefaultArgumentOptions,
  ExecutionPredicate,
  IgnoreCheckPredicate,
  KeySupplier,
  MissingPermissionSupplier,
  PrefixSupplier,
  RegexSupplier,
} from "discord-akairo";
import { PermissionResolvable, StringResolvable, Snowflake } from "discord.js";
import { Fire } from "../Fire";

export class Command extends AkairoCommand {
  client: Fire;
  hidden: boolean;
  args: ArgumentOptions[] | ArgumentGenerator;
  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases) options.aliases = [id];
    else options?.aliases?.push(id);
    super(id, options);
    this.hidden = options.hidden || false;
    this.args = options.args;
  }

  async init() {}

  async unload() {}
}

export interface CommandOptions extends AkairoModuleOptions {
  aliases?: string[];
  args?: ArgumentOptions[] | ArgumentGenerator;
  argumentDefaults?: DefaultArgumentOptions;
  before?: BeforeAction;
  channel?: "guild" | "dm";
  clientPermissions?:
    | PermissionResolvable
    | PermissionResolvable[]
    | MissingPermissionSupplier;
  condition?: ExecutionPredicate;
  cooldown?: number;
  description?: StringResolvable;
  editable?: boolean;
  flags?: string[];
  ignoreCooldown?: Snowflake | Snowflake[] | IgnoreCheckPredicate;
  ignorePermissions?: Snowflake | Snowflake[] | IgnoreCheckPredicate;
  lock?: KeySupplier | "guild" | "channel" | "user";
  optionFlags?: string[];
  ownerOnly?: boolean;
  prefix?: string | string[] | PrefixSupplier;
  ratelimit?: number;
  regex?: RegExp | RegexSupplier;
  separator?: string;
  typing?: boolean;
  userPermissions?:
    | PermissionResolvable
    | PermissionResolvable[]
    | MissingPermissionSupplier;
  quoted?: boolean;
  hidden?: boolean;
}

export interface ArgumentOptions extends ArgOptions {
  required?: boolean;
}
