import {
  ArgumentGenerator as AkairoArgumentGenerator,
  ArgumentOptions as AkairoArgumentOptions,
  Command as AkairoCommand,
  CommandOptions as AkairoCommandOptions,
  Flag,
} from "discord-akairo";
import {
  ApplicationCommandOptionType,
  Option,
} from "../interfaces/slashCommands";
import { titleCase } from "./constants";
import { Language } from "./language";
import { Fire } from "../Fire";

type ArgumentGenerator = (
  ...a: Parameters<AkairoArgumentGenerator>
) => IterableIterator<ArgumentOptions | Flag>;

const slashCommandTypeMappings = {
  SUB_COMMAND: [],
  SUB_COMMAND_GROUP: [],
  STRING: [
    "string",
    "codeblock",
    "command",
    "language",
    "listener",
    "module",
    "message",
  ],
  INTEGER: ["number"],
  BOOLEAN: ["boolean"],
  USER: ["user", "member", "user|member", "userSilent", "memberSilent"],
  CHANNEL: [
    "textChannel",
    "textChannelSilent",
    "category",
    "categorySilent",
    "guildChannel",
    "guildChannelSilent",
  ],
  ROLE: ["role", "roleSilent"],
};

export class Command extends AkairoCommand {
  client: Fire;
  group: boolean;
  parent?: string;
  hidden: boolean;
  premium: boolean;
  guilds: string[];
  ephemeral: boolean;
  superuserOnly: boolean;
  moderatorOnly: boolean;
  enableSlashCommand: boolean;
  description: (language: Language) => string;
  requiresExperiment?: { id: string; treatmentId?: number };
  args?: ArgumentOptions[] | ArgumentGenerator;

  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases?.length) options.aliases = [id];
    else options?.aliases?.push(id);
    if (!options?.clientPermissions)
      options.clientPermissions = [
        "SEND_MESSAGES",
        "USE_EXTERNAL_EMOJIS",
        "ADD_REACTIONS",
      ];
    if (options.args instanceof Array && options.args.length == 1)
      options.args[0].match = "rest";
    if (options.args instanceof Array)
      options.args.forEach((arg) => {
        if (!arg.readableType && arg.type) {
          if (arg.type instanceof Array) arg.readableType = arg.type.join("|");
          else arg.readableType = arg.type.toString();
          if (
            ["string", "snowflake", "boolean", "number"].includes(
              arg.readableType
            )
          )
            arg.readableType = arg.id;
        } else if (arg.flag && arg.match == "flag")
          arg.readableType = "boolean";
        else if (arg.flag && arg.match == "option" && !arg.type)
          arg.type = arg.readableType = "string";
        if (!arg.slashCommandType) {
          arg.slashCommandType = arg.readableType?.split("|")[0];
        }
      });
    if (!options.restrictTo) options.channel = "guild";
    else if (options.restrictTo != "all") options.channel = options.restrictTo;
    super(id, options);
    if (this.ownerOnly || options.superuserOnly) this.hidden = true;
    this.enableSlashCommand = options.enableSlashCommand || false;
    this.requiresExperiment = options.requiresExperiment || null;
    this.superuserOnly = options.superuserOnly || false;
    this.moderatorOnly = options.moderatorOnly || false;
    this.ephemeral = options.ephemeral || false;
    this.premium = options.premium || false;
    this.hidden = options.hidden || false;
    this.parent = options.parent || null;
    this.group = options.group || false;
    this.guilds = options.guilds || [];
    this.args = options.args;
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}

  getArgumentsClean() {
    return typeof this.args != "undefined" && Array.isArray(this.args)
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

  getSlashCommandJSON(): {
    name: string;
    description: string;
    options?: Option[];
  } {
    let data = {
      name: this.id,
      description:
        typeof this.description == "function"
          ? this.description(this.client.getLanguage("en-US"))
          : this.description || "No Description Provided",
    };
    if (!this.group) {
      if (this.args?.length)
        data["options"] = [
          ...(this.args as ArgumentOptions[])
            .filter((arg) => arg.readableType)
            .map((arg) => this.getSlashCommandOption(arg)),
        ];
    } else {
      const subcommands = this.client.commandHandler.modules.filter(
        (command: Command) => command.parent == this.id
      );
      data["options"] = [
        ...subcommands.map((command: Command) => command.getSubcommand()),
        ...(this.args as ArgumentOptions[])
          .filter((arg) => arg.readableType)
          .map((arg) => this.getSlashCommandOption(arg)),
      ];
    }
    return data;
  }

  getSlashCommandOption(argument: ArgumentOptions) {
    let options = {
      type:
        ApplicationCommandOptionType[
          Object.keys(slashCommandTypeMappings).find((type) =>
            slashCommandTypeMappings[type].includes(argument.type)
          ) || "STRING"
        ],
      name: argument.slashCommandType
        ? argument.slashCommandType
        : argument.readableType.split("|")[0],
      description:
        typeof argument.description == "function"
          ? argument.description(this.client.getLanguage("en-US"))
          : argument.description || "No Description Provided",
      required: argument.required,
    };
    if (
      argument.type instanceof Array &&
      argument.type.every((value) => typeof value == "string")
    ) {
      let choices: { name: string; value: string }[] = [];
      for (const type of argument.type as string[]) {
        choices.push({
          name: titleCase(type),
          value: type,
        });
      }
      options["choices"] = choices;
    } else if (argument.flag && argument.match == "flag") {
      options["name"] = argument.id;
      options["type"] = ApplicationCommandOptionType.BOOLEAN;
    } else if (argument.flag && argument.match == "option") {
      options["name"] = argument.id;
    }
    return options;
  }

  getSubcommand() {
    if (!this.parent) return;
    let data = {
      name: this.id.replace(`${this.parent}-`, ""),
      description:
        typeof this.description == "function"
          ? this.description(this.client.getLanguage("en-US"))
          : this.description || "No Description Provided",
      type: ApplicationCommandOptionType.SUB_COMMAND,
    };
    if (this.args?.length)
      data["options"] = [
        ...(this.args as ArgumentOptions[])
          .filter((arg) => arg.readableType)
          .map((arg) => this.getSlashCommandOption(arg)),
      ];
    return data;
  }

  getChildren() {
    if (!this.group) return null;
    const subcommands = this.client.commandHandler.modules.filter(
      (command: Command) => command.parent == this.id
    );
    return [
      ...subcommands.map((command) => [command.id, ...command.aliases]),
    ].flat(1);
  }

  async registerSlashCommand() {
    if (this.parent) return;
    const command = this.getSlashCommandJSON();
    let commands = [];
    if (!this.guilds.length) {
      // @ts-ignore
      const commandRaw = await this.client.api
        // @ts-ignore
        .applications(this.client.user.id)
        .commands.post({ data: command })
        .catch((e) => e);
      if (commandRaw?.id) commands.push(commandRaw);
      else if (commandRaw?.code != 30032)
        this.client.console.warn(
          `[Commands] Failed to register slash command for ${this.id}`,
          commandRaw
        );
    } else {
      this.guilds.forEach(async (guild) => {
        // @ts-ignore
        const commandRaw = await this.client.api
          // @ts-ignore
          .applications(this.client.user.id)
          .guilds(guild)
          .commands.post({ data: command })
          .catch((e) => e);
        if (commandRaw?.id) commands.push(commandRaw);
        else {
          if (commandRaw.httpStatus != 403 && commandRaw.code != 50001)
            this.client.console.warn(
              `[Commands] Failed to register slash command for ${this.id} in guild ${guild}`,
              commandRaw
            );
        }
      });
    }
    return commands;
  }
}

export interface CommandOptions extends AkairoCommandOptions {
  requiresExperiment?: { id: string; treatmentId?: number };
  args?: ArgumentOptions[] | ArgumentGenerator;
  restrictTo?: "guild" | "dm" | "all";
  enableSlashCommand?: boolean;
  superuserOnly?: boolean;
  moderatorOnly?: boolean;
  ephemeral?: boolean;
  premium?: boolean;
  guilds?: string[];
  hidden?: boolean;
  group?: boolean;
  parent?: string;
}

export interface ArgumentOptions extends AkairoArgumentOptions {
  slashCommandType?: string;
  readableType?: string;
  required?: boolean;
}
