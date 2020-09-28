import { ResponseLocals } from "../interfaces";
import * as express from "express";

export function publicRoute(req: express.Request, res: express.Response) {
  const { client } = res.locals as ResponseLocals;
  const publicGuilds = client.guilds.cache
    .filter(
      (guild) =>
        client.settings.get(guild.id, "utils.public", false) ||
        guild.features.includes("DISCOVERABLE")
    )
    .map((guild) => guild.id);
  res.status(200).json(publicGuilds);
}
