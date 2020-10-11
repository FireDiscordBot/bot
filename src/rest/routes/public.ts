import { FireGuild } from "../../../lib/extensions/guild";
import * as express from "express";

export function publicRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  const publicGuilds = client.guilds.cache
    .filter((guild: FireGuild) => guild.isPublic())
    .map((guild) => guild.id);
  res.json(publicGuilds);
}
