import { AkairoOptions } from "discord-akairo";

export const akairo: AkairoOptions = {
  ownerID: JSON.parse(process.env.ADMINS),
};
