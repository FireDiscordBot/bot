import { APIGuildMember as Member } from "discord-api-types";

export interface SlashCommand {
  type: number;
  token: string;
  member: Member;
  id: string;
  guild_id: string;
  data: CommandData;
  channel_id: string;
}

export interface CommandData {
  options: Option[];
  name: string;
  id: string;
}

export interface Option {
  name: string;
  value?: string | number | boolean;
  options?: Option[];
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
