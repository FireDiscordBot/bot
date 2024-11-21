import { Snowflake } from "discord-api-types/globals";

export interface ReactionRoleData {
  role: Snowflake;
  emoji: Snowflake | string;
}
