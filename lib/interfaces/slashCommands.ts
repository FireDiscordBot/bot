import { APIGuildMember as Member, APIUser as User } from "discord-api-types";

export interface SlashCommand {
  channel_id: string;
  data: CommandData;
  guild_id?: string;
  member?: Member;
  token: string;
  type: number;
  user: User;
  id: string;
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
