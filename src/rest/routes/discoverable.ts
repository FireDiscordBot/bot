import { FireGuild } from "../../../lib/extensions/guild";
import * as express from "express";

export function discoverableRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  let publicGuilds = (client.guilds.cache
    .filter((guild: FireGuild) => guild.isPublic())
    .array() as FireGuild[]).map((guild) => guild.getDiscoverableData());
  client.util.shuffleArray(publicGuilds);
  return res.json(publicGuilds);
}
