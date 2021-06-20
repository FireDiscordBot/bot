import { AkairoOptions } from "discord-akairo";
import { Snowflake } from "discord.js";

export const akairo: AkairoOptions = {
  ownerID: process.env.OWNER as Snowflake,
};
