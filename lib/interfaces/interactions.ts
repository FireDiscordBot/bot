import {
  APIInteractionDataResolvedChannel,
  APIInteractionGuildMember,
  APIGuildMember,
  APIMessage,
  APIUser,
  APIRole,
} from "discord-api-types";
import { Snowflake } from "discord.js";

export type Interaction =
  | {
      member?: APIGuildMember;
      channel_id: Snowflake;
      guild_id?: Snowflake;
      data: CommandData;
      user?: APIUser;
      token: string;
      id: Snowflake;
      type: 2;
    }
  | {
      message: APIMessage & { components: APIComponent[] };
      application_id: Snowflake;
      member?: APIGuildMember;
      data: ComponentData;
      channel_id: Snowflake;
      guild_id: Snowflake;
      version: number;
      user?: APIUser;
      token: string;
      id: Snowflake;
      type: 3;
    };

export interface SlashCommand {
  member?: APIGuildMember;
  channel_id: string;
  data: CommandData;
  guild_id?: string;
  user?: APIUser;
  token: string;
  id: string;
  type: 2;
}

export interface Button {
  message: APIMessage & { components: APIComponent[] };
  application_id: Snowflake;
  member?: APIGuildMember;
  channel_id: Snowflake;
  data: ComponentData;
  guild_id: Snowflake;
  version: number;
  user?: APIUser;
  token: string;
  id: Snowflake;
  type: 3;
}

export interface CommandData {
  options?: Option[];
  name: string;
  id: string;
}

export interface Option {
  type?: ApplicationCommandOptionType;
  value?: string | number | boolean;
  options?: Option[];
  name: string;
}

export interface ApplicationCommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: ApplicationCommandOptionChoice[];
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommandOptionChoice {
  name: string;
  value: string | number;
}

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP,
  STRING,
  INTEGER,
  BOOLEAN,
  USER,
  CHANNEL,
  ROLE,
  MENTIONABLE,
  NUMBER,
  MESSAGE, // not real, used as a pseudo type
}

export interface APIApplicationCommand {
  id: string;
  application_id: string;
  name: string;
  description: string;
  version: string;
  default_permission: boolean;
  options?: ApplicationCommandOption[];
}

export interface ApplicationCommand {
  name: string;
  id?: string;
  description: string;
  default_permission: boolean;
  options?: ApplicationCommandOption[];
}

export enum ApplicationCommandPermissionType {
  ROLE = 1,
  USER = 2,
}

export interface ApplicationCommandPermissions {
  id: string;
  type: ApplicationCommandPermissionType;
  permission: boolean; // true to allow, false, to disallow
}

export interface ComponentData {
  component_type: number;
  custom_id: string;
}

export enum ButtonStyle {
  PRIMARY = 1,
  SECONDARY,
  SUCCESS,
  DESTRUCTIVE,
  LINK,
}

export enum ButtonType {
  ACTION_ROW = 1,
  BUTTON,
}

export type ActionRow = {
  type: ButtonType.ACTION_ROW;
  components: APIComponent[];
};

export type ButtonEmoji = {
  id?: string;
  name?: string;
};

export type APIComponent =
  // interaction button with label
  | {
      style: Exclude<ButtonStyle, "LINK">;
      type: ButtonType.BUTTON;
      emoji?: ButtonEmoji;
      disabled?: boolean;
      custom_id: string;
      label: string;
    }
  // interaction button with emoji
  | {
      style: Exclude<ButtonStyle, "LINK">;
      type: ButtonType.BUTTON;
      disabled?: boolean;
      emoji: ButtonEmoji;
      custom_id: string;
      label?: string;
    }
  // interaction button with label and emoji
  | {
      style: Exclude<ButtonStyle, "LINK">;
      type: ButtonType.BUTTON;
      disabled?: boolean;
      emoji: ButtonEmoji;
      custom_id: string;
      label: string;
    }
  // link button with label
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      disabled?: boolean;
      label: string;
      url: string;
    }
  // link button with emoji
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      disabled?: boolean;
      emoji: ButtonEmoji;
      url: string;
    }
  // link button with label and emoji
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      disabled?: boolean;
      emoji: ButtonEmoji;
      label: string;
      url: string;
    }
  | {
      type: ButtonType.ACTION_ROW;
      components: APIComponent[];
    };

export enum ApplicationCommandType {
  CHAT_INPUT = 1,
  USER = 2,
  MESSAGE = 3,
}

export interface APIApplicationCommandOptionResolved {
  users?: Record<Snowflake, APIUser>;
  members?: Record<Snowflake, APIInteractionGuildMember>;
  roles?: Record<Snowflake, APIRole>;
  channels?: Record<Snowflake, APIInteractionDataResolvedChannel>;
  messages?: Record<Snowflake, APIMessage>;
}
