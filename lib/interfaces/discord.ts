import { APIUser } from "discord-api-types/v9";

export interface GuildApplicationCommandsUpdate {
  application_commands: ApplicationCommand[];
  applications: Application[];
  guild_id: string;
  nonce: string;
  updated_at: string;
}

export interface ApplicationCommand {
  application_id: string;
  default_permission: boolean;
  description: string;
  id: string;
  listed: boolean;
  name: string;
  permissions: any[];
  type: number;
  version: string;
  options?: ApplicationCommandOption[];
  guild_id?: string;
}

export interface ApplicationCommandOption {
  description: string;
  name: string;
  required?: boolean;
  type: number;
  options?: OptionOption[];
  choices?: Choice[];
}

export interface Choice {
  name: string;
  value: string;
}

export interface OptionOption {
  description: string;
  name: string;
  required: boolean;
  type: number;
}

export interface Application {
  bot: APIUser;
  command_count: number;
  icon: null | string;
  id: string;
  name: string;
}
