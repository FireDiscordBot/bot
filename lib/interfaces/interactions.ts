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
  | ApplicationCommandInteraction
  | ButtonInteraction
  | ApplicationCommandAutocompleteInteraction;

interface BaseInteraction {
  application_id: Snowflake;
  member?: APIGuildMember;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  type: 2 | 3 | 4;
  version: number;
  user?: APIUser;
  id: Snowflake;
  token: string;
}

export interface ApplicationCommandInteraction extends BaseInteraction {
  data: CommandData;
  type: 2;
}

export interface ButtonInteraction extends BaseInteraction {
  message: APIMessage & { components: APIComponent[] };
  data: ComponentData;
  type: 3;
}

export interface ApplicationCommandAutocompleteInteraction
  extends BaseInteraction {
  data: CommandData;
  type: 4;
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
  focused?: boolean;
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
  ATTACHMENT,
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
