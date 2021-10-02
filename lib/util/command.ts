import {
  ArgumentGenerator as AkairoArgumentGenerator,
  ArgumentOptions as AkairoArgumentOptions,
  CommandOptions as AkairoCommandOptions,
  Command as AkairoCommand,
  Flag,
} from "discord-akairo";
import {
  ApplicationCommandOptionData,
  ApplicationCommandData,
  ApplicationCommand,
  DiscordAPIError,
  Permissions,
  Snowflake,
  Role,
} from "discord.js";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { ApplicationCommandOptionType } from "discord-api-types";
import { Option } from "../interfaces/interactions";
import { FireGuild } from "../extensions/guild";
import { Language } from "./language";
import { Fire } from "@fire/lib/Fire";
import { FireMessage } from "../extensions/message";

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
  declare channel?: "guild" | "dm";
  enableSlashCommand: boolean;
  args?: ArgumentOptions[];
  moderatorOnly: boolean;
  superuserOnly: boolean;
  deferAnyways: boolean;
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
    this.deferAnyways = options.deferAnyways || false;
    this.slashOnly = options.slashOnly || false;
    this.ephemeral = options.ephemeral || false;
    this.premium = options.premium || false;
    this.hidden = options.hidden || false;
    this.parent = options.parent || null;
    this.context = options.context || [];
    this.group = options.group || false;
    this.guilds = options.guilds || [];
    this.args = options.args;
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}

  async autocomplete(guild: FireGuild, focused: Option) {
    return [];
  }

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

  private getSlashCommandArgName(argument: ArgumentOptions) {
    return (
      argument.slashCommandType
        ? argument.slashCommandType
        : argument.readableType.split("|")[0]
    )
      .replace("Silent", "")
      .toLowerCase();
  }

  getSlashCommandOption(argument: ArgumentOptions) {
    const type =
      (Object.keys(slashCommandTypeMappings).find((type) =>
        slashCommandTypeMappings[type].includes(argument.type)
      ) as unknown as ApplicationCommandOptionType) || "STRING";
    let options: ApplicationCommandOptionData = {
      type: type as keyof typeof ApplicationCommandOptionType,
      name: this.getSlashCommandArgName(argument),
      description:
        typeof argument.description == "function"
          ? argument.description(this.client.getLanguage("en-US"))
          : argument.description || "No Description Provided",
      required: argument.required,
      autocomplete: argument.autocomplete,
    };
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
      options["type"] = "BOOLEAN";
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

  async parseSlash(message: ApplicationCommandMessage) {
    const args = {};
    if (this.args?.length) {
      for (const arg of this.args) {
        let name = this.getSlashCommandArgName(arg);
        if (arg.flag && arg.readableType == "boolean")
          name = arg.id.toLowerCase();
        const [type] =
          arg.flag && !arg.type
            ? ["BOOLEAN"]
            : Object.entries(slashCommandTypeMappings).find(([, types]) =>
                types.includes(arg.type?.toString())
              ) ?? ["STRING"];
        switch (type) {
          case "STRING": {
            args[name] = message.slashCommand.options.getString(name);
            break;
          }
          case "INTEGER": {
            args[name] = message.slashCommand.options.getInteger(name);
            break;
          }
          case "BOOLEAN": {
            args[name] = message.slashCommand.options.getBoolean(name);
            break;
          }
          case "USER": {
            args[name] = message.slashCommand.options.getUser(name);
            break;
          }
          case "CHANNEL": {
            const resolvedChannel =
              message.slashCommand.options.getChannel(name);
            if (this.client.channels.cache.has(resolvedChannel.id))
              args[name] = this.client.channels.cache.get(resolvedChannel.id);
            break;
          }
          case "ROLE": {
            const role = message.slashCommand.options.getRole(name);
            if (role instanceof Role) args[name] = role;
            break;
          }
          case "MENTIONABLE": {
            if (message.slashCommand.options.getMember(name, false))
              args[name] = message.slashCommand.options.getMember(name);
            else if (
              message.slashCommand.options.getRole(name, false) instanceof Role
            )
              args[name] = message.slashCommand.options.getRole(name);
            break;
          }
        }
        if (!args[name] && typeof arg.type == "function")
          args[name] = await arg.type(
            message as unknown as FireMessage,
            message.slashCommand.options.get(name).value.toString()
          );
        else if (!args[name]) args[name] = arg.default;
      }
    }
    return args;
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
  restrictTo?: "guild" | "dm" | "all";
  enableSlashCommand?: boolean;
  args?: ArgumentOptions[];
  superuserOnly?: boolean;
  moderatorOnly?: boolean;
  deferAnyways?: boolean;
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
  autocomplete?: boolean;
  readableType?: string;
  required?: boolean;
}
