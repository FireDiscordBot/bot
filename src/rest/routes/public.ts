import * as express from "express";

export function publicRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  const publicGuilds = client.guilds.cache
    .filter(
      (guild) =>
        client.settings.get(guild.id, "utils.public", false) ||
        guild.features.includes("DISCOVERABLE")
    )
    .map((guild) => guild.id);
  res.json(publicGuilds);
}
