import { Fire } from "@fire/lib/Fire";
import {
  ArgumentOptions as AkairoArgumentOptions,
  Command as AkairoCommand,
  CommandOptions as AkairoCommandOptions,
  AkairoModule,
} from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";
import {
  APIApplicationCommandBasicOption,
  APIApplicationCommandOption,
  APIApplicationCommandSubcommandGroupOption,
  APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  PermissionFlagsBits,
} from "discord-api-types/v9";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  DMChannel,
  DiscordAPIError,
  GuildChannel,
  Invite,
  MessageAttachment,
  Role,
} from "discord.js";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { CommandInteraction } from "../extensions/commandinteraction";
import { ContextCommandMessage } from "../extensions/contextcommandmessage";
import { FireGuild } from "../extensions/guild";
import { FireMember } from "../extensions/guildmember";
import { FireMessage } from "../extensions/message";
import { FireUser } from "../extensions/user";
import {
  FireAPIApplicationCommand,
  IntegrationTypes,
  InteractionContexts,
} from "../interfaces/interactions";
import { Message } from "../ws/Message";
import { MessageUtil } from "../ws/util/MessageUtil";
import { EventType } from "../ws/util/constants";
import { SlashArgumentTypeCaster } from "./commandhandler";
import { UseExec, UseRun } from "./constants";
import { Language } from "./language";

const getSlashType = (type: string) => {
  switch (type) {
    case "string":
    case "codeblock":
    case "command":
    case "language":
    case "listener":
    case "module":
    case "message":
      return ApplicationCommandOptionType.String;
    case "number":
      return ApplicationCommandOptionType.Integer;
    case "boolean":
      return ApplicationCommandOptionType.Boolean;
    case "user":
    case "member":
    case "user|member":
    case "user|member|snowflake":
    case "userSilent":
    case "memberSilent":
      return ApplicationCommandOptionType.User;
    case "channel":
    case "textChannel":
    case "voiceChannel":
    case "textChannelSilent":
    case "category":
    case "categorySilent":
    case "guildChannel":
    case "guildChannelSilent":
      return ApplicationCommandOptionType.Channel;
    case "role":
    case "roleSilent":
      return ApplicationCommandOptionType.Role;
    case "member|role":
      return ApplicationCommandOptionType.Mentionable;
    case "image":
      return ApplicationCommandOptionType.Attachment;
    default:
      return ApplicationCommandOptionType.String;
  }
};

const canAcceptMember = [
  "member",
  "user|member",
  "user|member|snowflake",
  "memberSilent",
];

const mustBeMember = ["member", "memberSilent"];
const MEMBER_INSTEAD_OF_USER = "is of type: USER; expected a non-empty value.";

const getChannelTypes = (
  type: string
): Exclude<ChannelType, ChannelType.DM | ChannelType.GroupDM>[] => {
  switch (type) {
    case "textChannel":
    case "textChannelSilent":
      return [
        ChannelType.GuildText,
        ChannelType.AnnouncementThread,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
      ];
    case "voiceChannel":
      return [ChannelType.GuildVoice, ChannelType.GuildStageVoice];
    case "category":
    case "categorySilent":
      return [ChannelType.GuildCategory];
    case "guildChannel":
    case "guildChannelSilent":
      return [
        ChannelType.GuildText,
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice,
        ChannelType.GuildCategory,
        ChannelType.AnnouncementThread,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
      ];
    default:
      return [];
  }
};

// const channelTypeMapping: Record<
//   string,
//   Exclude<ChannelTypes, ChannelTypes.UNKNOWN>[]
// > = {
//   textChannel: [
//     ChannelTypes.GUILD_TEXT,
//     ChannelTypes.GUILD_NEWS_THREAD,
//     ChannelTypes.GUILD_PUBLIC_THREAD,
//     ChannelTypes.GUILD_PRIVATE_THREAD,
//   ],
//   voiceChannel: [ChannelTypes.GUILD_VOICE, ChannelTypes.GUILD_STAGE_VOICE],
//   textChannelSilent: [
//     ChannelTypes.GUILD_TEXT,
//     ChannelTypes.GUILD_NEWS_THREAD,
//     ChannelTypes.GUILD_PUBLIC_THREAD,
//     ChannelTypes.GUILD_PRIVATE_THREAD,
//   ],
//   category: [ChannelTypes.GUILD_CATEGORY],
//   categorySilent: [ChannelTypes.GUILD_CATEGORY],
//   guildChannel: [
//     ChannelTypes.GUILD_TEXT,
//     ChannelTypes.GUILD_VOICE,
//     ChannelTypes.GUILD_STAGE_VOICE,
//     ChannelTypes.GUILD_CATEGORY,
//     ChannelTypes.GUILD_NEWS_THREAD,
//     ChannelTypes.GUILD_PUBLIC_THREAD,
//     ChannelTypes.GUILD_PRIVATE_THREAD,
//   ],
// };

export class InvalidArgumentContextError extends Error {
  argument: string;
  constructor(arg: string) {
    super(`Argument ${arg} is invalid in this context`);
    this.argument = arg;
  }
}

export class Command extends AkairoCommand {
  public declare userPermissions: bigint[];
  public declare clientPermissions: bigint[];

  requiresExperiment?: { id: number; bucket: number };
  declare description: (language: Language) => string;
  slashIds: Record<Snowflake, Snowflake>; // map of guild id to snowflake if guild specific
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
  slashId: Snowflake;
  context: string[];
  premium: boolean;
  parent?: string;
  hidden: boolean;
  group: boolean;

  constructor(id: string, options?: CommandOptions) {
    if (!options?.aliases?.length) options.aliases = [id];
    else options?.aliases?.push(id);
    if (!options?.clientPermissions && !options?.slashOnly)
      options.clientPermissions = [
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AddReactions,
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
        else if (!arg.type) arg.type = "string";
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
    this.slashId = null;
    this.slashIds = {};
  }

  async init(): Promise<any> {}

  async unload(): Promise<any> {}

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ): Promise<ApplicationCommandOptionChoiceData[] | string[]> {
    return [];
  }

  async exec(message: FireMessage, args: Record<string, any>): Promise<any> {
    throw new UseRun();
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: Record<string, any>
  ): Promise<any> {
    throw new UseExec();
  }

  get parentCommand(): Command | null {
    if (!this.parent) return null;
    else return this.client.getCommand(this.parent);
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
    let data: FireAPIApplicationCommand = {
      name: this.id,
      description:
        typeof this.description == "function"
          ? this.description(this.client.getLanguage("en-US"))
          : this.description || "No Description Provided",
      type: ApplicationCommandType.ChatInput,
      default_permission: true, // TODO: think about maybe switching to default_member_permissions
      default_member_permissions: null,
      dm_permission: !this.channel || this.channel == "dm", // TODO: switch to contexts
      options: [],
      integration_types:
        this.channel == "guild"
          ? [IntegrationTypes.GUILD_INSTALL]
          : [IntegrationTypes.GUILD_INSTALL, IntegrationTypes.USER_INSTALL],
      contexts:
        this.channel == "guild"
          ? [InteractionContexts.GUILD]
          : [
              InteractionContexts.GUILD,
              InteractionContexts.BOT_DM,
              InteractionContexts.PRIVATE_CHANNEL,
            ],
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
      const subcommands = this.getSubcommands();
      const subcommandGroups = this.getSubcommandGroups();
      // @ts-ignore (i am in too much pain to figure out why this is complaining)
      data["options"] = [
        ...subcommandGroups.map((command: Command) =>
          command.getSubcommandGroup()
        ),
        ...subcommands.map((command: Command) => command.getSubcommand()),
        // ...((this.args as ArgumentOptions[]) ?? [])
        //   .filter((arg) => arg.readableType)
        //   .map((arg) => this.getSlashCommandOption(arg)),
      ];
    }
    return data;
  }

  getSlashCommandMention(guild?: FireGuild, subcommand?: Command) {
    if (this.parentCommand)
      return this.parentCommand.getSlashCommandMention(guild, this);
    if (this.guilds.length && !guild) return null;
    else if (this.guilds.length && !this.guilds.includes(guild.id)) return null;
    return `</${subcommand ? subcommand.id.replace("-", " ") : this.id}:${
      guild ? this.slashIds[guild.id] ?? this.slashId : this.slashId
    }>`;
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

  getSubcommands() {
    return this.client.commandHandler.modules.filter(
      (command: Command) => command.parent == this.id && !command.group
    );
  }

  getSubcommandGroups() {
    return this.client.commandHandler.modules.filter(
      (command: Command) => command.parent == this.id && command.group
    );
  }

  getSlashCommandOption(
    argument: ArgumentOptions
  ): APIApplicationCommandOption {
    // @ts-ignore
    let options: APIApplicationCommandBasicOption & { autocomplete?: boolean } =
      {
        type: getSlashType(argument.type?.toString()),
        name: this.getSlashCommandArgName(argument),
        description:
          typeof argument.description == "function"
            ? argument.description(this.client.getLanguage("en-US"))
            : argument.description || "No Description Provided",
        required: argument.required,
        autocomplete: argument.autocomplete,
      };
    if (
      options.type == ApplicationCommandOptionType.Channel &&
      typeof argument.type == "string"
    )
      options.channel_types = getChannelTypes(argument.type);
    if (argument.flag && argument.match == "flag") {
      options["name"] = argument.id.toLowerCase();
      options["type"] = ApplicationCommandOptionType.Boolean;
    } else if (argument.flag && argument.match == "option") {
      options["name"] = argument.id.toLowerCase();
    }
    return options;
  }

  getSubcommand(): APIApplicationCommandSubcommandOption {
    if (!this.parent) return;
    let data: APIApplicationCommandSubcommandOption = {
      name: this.id.split(`${this.parent}-`).slice(1).join("-"),
      description:
        typeof this.description == "function"
          ? this.description(this.client.getLanguage("en-US"))
          : this.description || "No Description Provided",
      type: ApplicationCommandOptionType.Subcommand,
    };
    if (this.args?.length)
      data["options"] = (this.args as ArgumentOptions[])
        .filter((arg) => arg.readableType)
        .map((arg) =>
          this.getSlashCommandOption(arg)
        ) as APIApplicationCommandBasicOption[];
    return data;
  }

  getSubcommandGroup(): APIApplicationCommandSubcommandGroupOption {
    if (!this.parent || !this.group) return;
    let data: APIApplicationCommandSubcommandGroupOption = {
      name: this.id.split(`${this.parent}-`).slice(1).join("-"),
      description:
        typeof this.description == "function"
          ? this.description(this.client.getLanguage("en-US"))
          : this.description || "No Description Provided",
      type: ApplicationCommandOptionType.SubcommandGroup,
    };
    data["options"] = this.getSubcommands().map((command: Command) =>
      command.getSubcommand()
    );
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

  async parseSlash(message: ApplicationCommandMessage | ContextCommandMessage) {
    const interaction =
      message instanceof ApplicationCommandMessage
        ? message.slashCommand
        : message.contextCommand;
    if (!this.args?.length) return {};
    const args = {};
    if (message instanceof ApplicationCommandMessage) {
      for (const arg of this.args) {
        let required = arg.required;
        let name = this.getSlashCommandArgName(arg);
        if (arg.flag && arg.readableType == "boolean")
          name = arg.id.toLowerCase();
        const type =
          arg.flag && !arg.type
            ? ApplicationCommandOptionType.Boolean
            : getSlashType(arg.type.toString());
        switch (type) {
          case ApplicationCommandOptionType.String: {
            args[arg.id] =
              (interaction as CommandInteraction).options.getString(
                name,
                required
              ) ?? arg.default;
            if (
              this.client.commandHandler.resolver.types.has(
                arg.type.toString()
              ) &&
              args[arg.id]
            ) {
              const resolver = this.client.commandHandler.resolver.types.get(
                arg.type.toString()
              ) as unknown as SlashArgumentTypeCaster;
              args[arg.id] = await resolver(message, args[arg.id]);
            } else if (typeof arg.type == "function" && args[arg.id]) {
              args[arg.id] = await (
                arg.type as unknown as SlashArgumentTypeCaster
              ).bind(this)(
                message,
                interaction.options.get(name)?.value.toString()
              );
            } else if (arg.type instanceof RegExp) {
              const match = (args[arg.id] as string).match(arg.type);
              if (!match) args[arg.id] = null;

              const matches: RegExpExecArray[] = [];

              if (arg.type.global) {
                let matched: RegExpExecArray;

                while ((matched = arg.type.exec(args[arg.id])) != null) {
                  matches.push(matched);
                }
              }

              args[arg.id] = { match, matches };
            }
            break;
          }
          case ApplicationCommandOptionType.Integer: {
            args[arg.id] =
              (interaction as CommandInteraction).options.getInteger(
                name,
                required
              ) ?? arg.default;
            break;
          }
          case ApplicationCommandOptionType.Boolean: {
            args[arg.id] =
              (interaction as CommandInteraction).options.getBoolean(
                name,
                required
              ) ?? arg.default;
            break;
          }
          case ApplicationCommandOptionType.User: {
            const hasGuild = !!interaction.guild;
            if (mustBeMember.includes(arg.type?.toString()) && hasGuild)
              try {
                args[arg.id] =
                  interaction.options.getMember(name, arg.required) ??
                  arg.default;
              } catch (e) {
                if (
                  e instanceof TypeError &&
                  e.message.includes(MEMBER_INSTEAD_OF_USER)
                )
                  return await message.error("MEMBER_NOT_FOUND_COMPONENT");
                else throw e;
              }
            else if (canAcceptMember.includes(arg.type?.toString()) && hasGuild)
              args[arg.id] =
                interaction.options.getMember(name, false) ??
                interaction.options.getUser(name, required) ??
                arg.default;
            else if (mustBeMember.includes(arg.type?.toString()) && !hasGuild) {
              const didSpecifyMember = interaction.options.getMember(
                name,
                false
              );
              if (didSpecifyMember)
                throw new InvalidArgumentContextError(arg.id);
              else
                args[arg.id] =
                  interaction.options.getUser(name, required) ?? arg.default;
            } else
              args[arg.id] =
                interaction.options.getUser(name, required) ?? arg.default;
            break;
          }
          case ApplicationCommandOptionType.Channel: {
            const resolvedChannel = (
              interaction as CommandInteraction
            ).options.getChannel(name);
            if (
              resolvedChannel &&
              this.client.channels.cache.has(resolvedChannel.id)
            )
              args[arg.id] = this.client.channels.cache.get(resolvedChannel.id);
            else args[arg.id] = arg.default;
            break;
          }
          case ApplicationCommandOptionType.Role: {
            const role = (interaction as CommandInteraction).options.getRole(
              name
            );
            if (role instanceof Role) args[arg.id] = role;
            else if (typeof role == "object" && role?.id)
              // @ts-ignore
              args[arg.id] = new Role(this.client, role, {
                id: interaction.guildId,
              });
            else args[arg.id] = arg.default;
            break;
          }
          case ApplicationCommandOptionType.Mentionable: {
            const mentionable = (
              interaction as CommandInteraction
            ).options.getMentionable(name);
            if (
              mentionable instanceof Role ||
              mentionable instanceof FireMember
            )
              args[arg.id] = mentionable;
            else if (mentionable instanceof FireUser && message.guild) {
              const member = await message.guild.members
                .fetch(mentionable)
                .catch(() => {});
              if (member) args[arg.id] = member;
            } else args[arg.id] = arg.default;
            break;
          }
          case ApplicationCommandOptionType.Attachment: {
            args[arg.id] =
              (interaction as CommandInteraction).options?.getAttachment?.(
                name,
                required
              ) ?? arg.default;
            break;
          }
          default: {
            const resolver = this.client.commandHandler.resolver.types.get(
              arg.type.toString()
            ) as unknown as SlashArgumentTypeCaster;
            if (typeof resolver == "function")
              args[arg.id] = await resolver(
                message,
                interaction.options.get(name, required)?.value.toString()
              );
          }
        }
        if (
          typeof args[arg.id] == "undefined" &&
          typeof arg.type == "function"
        ) {
          try {
            args[arg.id] = await (
              arg.type as unknown as SlashArgumentTypeCaster
            ).bind(this)(
              message,
              interaction.options.get(name, true)?.value.toString()
            );
          } catch {
            args[arg.id] = arg.default;
          }
        } else if (typeof args[arg.id] == "undefined")
          args[arg.id] = arg.default;
      }
      for (const arg of this.args) {
        let values: any[];
        if (Array.isArray(args[arg.id])) values = args[arg.id];
        else values = [args[arg.id]];
        for (const value of values) {
          if (typeof value == "undefined" || value == null) continue;
          if (
            value == arg.default &&
            !interaction.options.get(this.getSlashCommandArgName(arg), false)
          )
            continue;
          if (typeof value != "object") {
            message.util.parsed.content += ` ${arg.flag ?? ""}${
              arg.match == "flag" ? "" : ` ${value}`
            }`;
            message.util.parsed.afterPrefix += ` ${arg.flag ?? ""}${
              arg.match == "flag" ? "" : ` ${value}`
            }`;
          } else if (typeof value == "object") {
            let stringified: string;
            if (value instanceof FireUser || value instanceof FireMember)
              stringified = `@${value}`;
            else if (value instanceof Role) stringified = `@${value.name}`;
            else if (value instanceof GuildChannel)
              stringified = `#${value.name}`;
            else if (value instanceof DMChannel)
              stringified = `#${value.recipient} (${value.recipient.id})`;
            else if (value instanceof MessageAttachment)
              stringified = value.name;
            else if (value instanceof Invite)
              stringified = `discord.gg/${value.code}`;
            else if (value instanceof AkairoModule) stringified = value.id;
            else if (
              interaction.options.get(this.getSlashCommandArgName(arg), false)
                ?.type == "STRING"
            )
              stringified = interaction.options
                .get(this.getSlashCommandArgName(arg), true)
                .value.toString();
            else stringified = "UNKNOWN_ARG_TYPE";
            if (arg.flag) stringified = `${arg.flag} ${stringified}`;
            message.util.parsed.content += ` ${stringified}`;
            message.util.parsed.afterPrefix += ` ${stringified}`;
          }
        }
      }
    }
    message.util.parsed.content = message.util.parsed.content.trim();
    message.util.parsed.afterPrefix = message.util.parsed.afterPrefix.trim();
    return args;
  }

  async registerSlashCommand() {
    if (this.parent) return;
    const commandData = this.getSlashCommandJSON();
    let commands: (FireAPIApplicationCommand & { guild?: FireGuild })[] = [];
    if (!this.guilds.length) {
      const command = await this.client.req
        .applications(this.client.application.id)
        .commands.post<FireAPIApplicationCommand>({
          data: commandData,
        })
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
      else if (command.id) {
        this.slashId = command.id;
        commands.push(command);
      }
    } else {
      for (const guildId of this.guilds) {
        const guild = this.client.guilds.cache.get(guildId) as FireGuild;
        if (!guild) continue;
        const command = await this.client.req
          .applications(this.client.application.id)
          .guilds(guildId)
          .commands.post<FireAPIApplicationCommand>({
            data: commandData,
          })
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
        else if (command.id) {
          this.slashIds[guildId] = command.id;
          commands.push({ ...command, guild });
        }
      }
    }
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.REFRESH_SLASH_COMMAND_IDS, {
          commands: this.client.commandHandler.modules.map((command) => ({
            id: command.id,
            slashId: command.slashId,
            slashIds: command.slashIds,
          })),
        })
      )
    );
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
  slashCommandType?: string;
  autocomplete?: boolean;
  readableType?: string;
  required?: boolean;
}
