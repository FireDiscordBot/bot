import { Snowflake } from "discord.js";

export interface Reminder {
  user: Snowflake;
  text: string;
  link?: string;
  legacy?: boolean;
  timestamp: number;
}
