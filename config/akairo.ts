import { AkairoOptions } from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";

export const akairo: AkairoOptions = {
  ownerID: process.env.OWNER as Snowflake,
};
