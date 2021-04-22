import { APIGuildMember, APIUser, APIMessage } from "discord-api-types";

export type Interaction =
  | {
      member?: APIGuildMember;
      channel_id: string;
      data: CommandData;
      guild_id?: string;
      token: string;
      user?: APIUser;
      id: string;
      type: 2;
    }
  | {
      member?: APIGuildMember;
      application_id: string;
      data: ComponentData;
      message: APIMessage;
      channel_id: string;
      guild_id: string;
      version: number;
      user?: APIUser;
      token: string;
      id: string;
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
  member?: APIGuildMember;
  application_id: string;
  data: ComponentData;
  message: APIMessage;
  channel_id: string;
  guild_id: string;
  version: number;
  user?: APIUser;
  token: string;
  id: string;
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
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
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

export type APIComponent =
  | {
      type: ButtonType.BUTTON;
      style: Exclude<ButtonStyle, "LINK">;
      custom_id: string;
      label: string;
    }
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      url: string;
      label: string;
    }
  | {
      type: ButtonType.ACTION_ROW;
      components: APIComponent[];
    };
