import {
  ArgumentGenerator as AkairoArgumentGenerator,
  ArgumentOptions as AkairoArgumentOptions,
  CommandOptions as AkairoCommandOptions,
  Command as AkairoCommand,
  Flag,
} from "discord-akairo";
import {
  CommandOptionDataTypeResolvable,
  ApplicationCommandOptionData,
  ApplicationCommandData,
  ApplicationCommand,
  DiscordAPIError,
  Permissions,
  Snowflake,
} from "discord.js";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";
import { FireGuild } from "../extensions/guild";
import { Language } from "./language";
import { Fire } from "@fire/lib/Fire";

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
  USER: [
    "user",
    "member",
    "user|member",
    "user|member|snowflake",
    "userSilent",
    "memberSilent",
  ],
  CHANNEL: [
    "textChannel",
    "voiceChannel",
    "textChannelSilent",
    "category",
    "categorySilent",
    "guildChannel",
    "guildChannelSilent",
  ],
  ROLE: ["role", "roleSilent"],
  MENTIONABLE: ["member|role"],
};

export class Command extends AkairoCommand {
  requiresExperiment?: { id: number; bucket: number };
  declare description: (language: Language) => string;
  args?: ArgumentOptions[] | ArgumentGenerator;
  declare channel?: "guild" | "dm";
  enableSlashCommand: boolean;
  moderatorOnly: boolean;
  superuserOnly: boolean;
  declare client: Fire;
  guilds: Snowflake[];
  slashOnly: boolean;
  ephemeral: boolean;
  context: string[];
  premium: boolean;
  parent?: string;
  hidden: boolean;
  group: boolean;

  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases?.length) options.aliases = [id];
    else options?.aliases?.push(id);
    if (!options?.clientPermissions)
      options.clientPermissions = [
        Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ADD_REACTIONS,
      ];
    if (
      options.args instanceof Array &&
      options.args.length == 1 &&
      !options.args[0].match
    )
      options.args[0].match = "rest";
    if (options.args instanceof Array)
      options.args.forEach((arg) => {
        if (!arg.readableType && arg.type) {
          if (arg.type instanceof Array) arg.readableType = arg.type.join("|");
          else arg.readableType = arg.type.toString();
          if (arg.readableType.toLowerCase().endsWith("silent"))
            arg.readableType = arg.readableType.slice(
              0,
              arg.readableType.length - 6
            );
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
          arg.slashCommandType =
            arg.readableType?.split("|")[0] ?? arg.type.toString();
        }

        arg.readableType = arg.readableType.toLowerCase();
      });
    if (!options.restrictTo) options.channel = "guild";
    else if (options.restrictTo != "all") options.channel = options.restrictTo;
    // @ts-ignore
    super(id, options);
    if (this.ownerOnly || options.superuserOnly) this.hidden = true;
    this.enableSlashCommand = options.enableSlashCommand || false;
    this.requiresExperiment = options.requiresExperiment || null;
    this.superuserOnly = options.superuserOnly || false;
    this.moderatorOnly = options.moderatorOnly || false;
    this.slashOnly = options.slashOnly || false;
    this.ephemeral = options.ephemeral || false;
    this.premium = options.premium || false;
    this.hidden = options.hidden || false;
    this.parent = options.parent || null;
    this.group = options.group || false;
    this.guilds = options.guilds || [];
    this.args = options.args;
    this.context = options.context || [];
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}

  isDisabled(guild: FireGuild) {
    return guild?.settings
      .get<string[]>("disabled.commands", [])
      .includes(this.id);
  }

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

  getSlashCommandJSON(id?: string) {
    let data: ApplicationCommandData & { id?: string } = {
      name: this.id,
      description:
        typeof this.description == "function"
          ? this.description(this.client.getLanguage("en-US"))
          : this.description || "No Description Provided",
      type: "CHAT_INPUT",
      defaultPermission: true,
    };
    if (id) data.id = id;
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
      // @ts-ignore (i am in too much pain to figure out why this is complaining)
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
    const type =
      (Object.keys(slashCommandTypeMappings).find((type) =>
        slashCommandTypeMappings[type].includes(argument.type)
      ) as CommandOptionDataTypeResolvable) ||
      ApplicationCommandOptionTypes.STRING;
    let options: ApplicationCommandOptionData = {
      type,
      name: (argument.slashCommandType
        ? argument.slashCommandType
        : argument.readableType.split("|")[0]
      )
        .replace("Silent", "")
        .toLowerCase(),
      description:
        typeof argument.description == "function"
          ? argument.description(this.client.getLanguage("en-US"))
          : argument.description || "No Description Provided",
      required: argument.required,
    };
    if (!options.description) delete options.description;
    if (
      argument.slashCommandOptions ||
      (argument.type instanceof Array &&
        argument.type.every((value) => typeof value == "string"))
    ) {
      let choices: { name: string; value: string }[] = [];
      for (const type of (argument.slashCommandOptions ||
        argument.type) as string[]) {
        choices.push({
          name: type.toLowerCase(),
          value: type,
        });
      }
      options["choices"] = choices;
    } else if (argument.flag && argument.match == "flag") {
      options["name"] = argument.id.toLowerCase();
      options["type"] = ApplicationCommandOptionTypes.BOOLEAN;
    } else if (argument.flag && argument.match == "option") {
      options["name"] = argument.id.toLowerCase();
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
      type: ApplicationCommandOptionTypes.SUB_COMMAND,
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
    const commandData = this.getSlashCommandJSON();
    let commands: ApplicationCommand[] = [];
    if (!this.guilds.length) {
      const command = await this.client.application.commands
        .create(commandData)
        .catch((e: Error) => e);
      if (command instanceof DiscordAPIError)
        command.code != 30032 &&
          this.client.console.warn(
            `[Commands] Failed to register slash command for ${this.id}`,
            command
          );
      else if (command instanceof Error)
        this.client.console.warn(
          `[Commands] Failed to register slash command for ${this.id}`,
          command.stack
        );
      else if (command.id) commands.push(command);
    } else {
      for (const guildId of this.guilds) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) continue;
        const command = await guild.commands
          .create(commandData)
          .catch((e: Error) => e);
        if (command instanceof DiscordAPIError)
          command.httpStatus != 403 &&
            command.code != 50001 &&
            this.client.console.warn(
              `[Commands] Failed to register slash command for ${this.id} in guild ${guild}`,
              command.stack
            );
        else if (command instanceof Error)
          this.client.console.warn(
            `[Commands] Failed to register slash command for ${this.id} in guild ${guild}`,
            command.stack
          );
        else if (command.id) commands.push(command);
      }
    }
    return commands;
  }
}

// @ts-ignore
export interface CommandOptions extends AkairoCommandOptions {
  description?: ((language: Language) => string) | string;
  requiresExperiment?: { id: number; bucket: number };
  args?: ArgumentOptions[] | ArgumentGenerator;
  restrictTo?: "guild" | "dm" | "all";
  enableSlashCommand?: boolean;
  superuserOnly?: boolean;
  moderatorOnly?: boolean;
  guilds?: Snowflake[];
  slashOnly?: boolean;
  ephemeral?: boolean;
  context?: string[];
  premium?: boolean;
  hidden?: boolean;
  group?: boolean;
  parent?: string;
}

// @ts-ignore
export interface ArgumentOptions extends AkairoArgumentOptions {
  description?: ((language: Language) => string) | string;
  slashCommandOptions?: Array<string>;
  slashCommandType?: string;
  readableType?: string;
  required?: boolean;
}
