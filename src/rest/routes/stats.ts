import * as express from "express";

export async function statsRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  const stats = await client.util.getClusterStats();
  stats.shards.forEach((shard) => {
    delete shard.publicGuilds;
    delete shard.discoverableGuilds;
  }); // These are only here for Aether. The /public & /discoverable endpoints should be used to get this data
  res.json(stats);
}
