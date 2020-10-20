import * as express from "express";

export async function statsRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  res.json(await client.util.getClusterStats());
}
