import { FireGuild } from "../../../lib/extensions/guild";
import * as express from "express";

export function discoverableRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  let body = [];
  let publicGuilds = client.guilds.cache
    .filter((guild: FireGuild) => guild.isPublic())
    .array() as FireGuild[];
  client.util.shuffleArray(publicGuilds);
  res.json(publicGuilds);
  publicGuilds.forEach((guild) => {
    const splash =
      (guild.splashURL || guild.discoverySplashURL)({
        size: 2048,
        format: "png",
      }).replace("size=2048", "size=320") || "https://i.imgur.com/jWRMBRd.png";
    const icon = guild.iconURL({
      format: guild.icon.startsWith("a_") ? "gif" : "png",
      size: 128,
    });
    let badge = ""; // Is this even used anymore?
    if (guild.features.includes("VERIFIED"))
      badge =
        "https://cdn.discordapp.com/emojis/751196492517081189.png?size=16";
    else if (guild.features.includes("PARTNERED"))
      badge =
        "https://cdn.discordapp.com/emojis/748876805011931188.png?size=16";
    body.push({
      name: guild.name,
      id: guild.id,
      icon,
      splash,
      vanity: `https://discover.inv.wtf/${guild.id}`,
      members: guild.memberCount.toLocaleString(),
    });
    return res.json(body);
  });
}
