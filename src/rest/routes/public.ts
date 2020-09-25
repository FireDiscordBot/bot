import { FireGuild } from "../../../lib/extensions/guild";
import { ResponseLocals } from "../interfaces";
import * as express from "express";

export async function publicRoute(req: express.Request, res: express.Response) {
  const locals: ResponseLocals = res.locals as ResponseLocals;
  let publicGuilds: string[] = [];
  locals.client.guilds.cache.forEach((guild: FireGuild) => {
    if (
      locals.client.settings.get(guild.id, "utils.public", false) ||
      guild.features.includes("DISCOVERABLE")
    )
      publicGuilds.push(guild.id);
  });
  res.status(200).json(publicGuilds);
}
