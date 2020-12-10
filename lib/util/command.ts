import {
  ArgumentGenerator as AkairoArgumentGenerator,
  ArgumentOptions as AkairoArgumentOptions,
  Command as AkairoCommand,
  CommandOptions as AkairoCommandOptions,
  Flag,
} from "discord-akairo";
import { ApplicationCommandOptionType } from "../interfaces/slashCommands";
import { titleCase } from "./constants";
import { Language } from "./language";
import { Fire } from "../Fire";

type ArgumentGenerator = (
  ...a: Parameters<AkairoArgumentGenerator>
) => IterableIterator<ArgumentOptions | Flag>;

const slashCommandTypeMappings = {
  SUB_COMMAND: [],
  SUB_COMMAND_GROUP: [],
  STRING: ["string", "codeblock", "command", "language", "listener", "module"],
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
  hidden: boolean;
  premium: boolean;
  guilds: string[];
  ephemeral: boolean;
  enableSlashCommand: boolean;
  description: (language: Language) => string;
  requiresExperiment?: { id: string; treatmentId?: number };
  args?: ArgumentOptions[] | ArgumentGenerator;

  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases) options.aliases = [id];
    else options?.aliases?.push(id);
    if (options.args instanceof Array && options.args.length == 1)
      options.args[0].match = "rest";
    if (options.args instanceof Array)
      options.args.forEach((arg) => {
        if (!arg.readableType && arg.type) {
          arg.readableType = arg.type.toString();
          if (arg.readableType == "string") arg.readableType = arg.id;
        } else if (arg.flag && arg.match == "flag")
          arg.readableType = "boolean";
        if (!arg.slashCommandType) {
          arg.slashCommandType = arg.readableType?.split("|")[0];
        }
      });
    if (!options.restrictTo) options.channel = "guild";
    else if (options.restrictTo != "all") options.channel = options.restrictTo;
    super(id, options);
    this.enableSlashCommand = options.enableSlashCommand || false;
    this.ephemeral = options.ephemeral || false;
    this.hidden = options.hidden || false;
    if (this.ownerOnly) this.hidden = true;
    this.premium = options.premium || false;
    this.guilds = options.guilds || [];
    this.requiresExperiment = options.requiresExperiment || null;
    this.args = options.args;
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}

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

  getSlashCommandJSON() {
    let data = {
      name: titleCase(this.id),
      description: this.description(this.client.getLanguage("en-US")),
    };
    if (this.args?.length)
      data["options"] = [
        ...(this.args as ArgumentOptions[])
          .filter((arg) => arg.readableType)
          .map((arg) => this.getSlashCommandOption(arg)),
      ];
    return data;
  }

  getSlashCommandOption(argument: ArgumentOptions) {
    let options = {
      name: argument.slashCommandType
        ? argument.slashCommandType
        : argument.readableType.split("|")[0],
      description:
        typeof argument.description == "function"
          ? argument.description(this.client.getLanguage("en-US"))
          : argument.description || "No Description Provided",
      type:
        ApplicationCommandOptionType[
          Object.keys(slashCommandTypeMappings).find((type) =>
            slashCommandTypeMappings[type].includes(argument.type)
          ) || "STRING"
        ],
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
      options["type"] = ApplicationCommandOptionType.BOOLEAN;
    }
    return options;
  }

  async registerSlashCommand() {
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
      else
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
  hidden?: boolean;
  premium?: boolean;
  guilds?: string[];
  enableSlashCommand?: boolean;
  ephemeral?: boolean;
  requiresExperiment?: { id: string; treatmentId?: number };
  args?: ArgumentOptions[] | ArgumentGenerator;
  restrictTo?: "guild" | "dm" | "all";
}

export interface ArgumentOptions extends AkairoArgumentOptions {
  required?: boolean;
  readableType?: string;
  slashCommandType?: string;
}
