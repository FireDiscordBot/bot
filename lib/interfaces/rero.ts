import { Snowflake } from "discord.js";

export interface ReactionRoleData {
  role: Snowflake;
  emoji: Snowflake | string;
}