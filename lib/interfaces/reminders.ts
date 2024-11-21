import { Snowflake } from "discord-api-types/globals";

export interface Reminder {
  user: Snowflake;
  text: string;
  link: string;
  timestamp: number;
}
