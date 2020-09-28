import * as express from "express";
import * as moment from "moment";

export function rootRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  res.json({
    success: true,
    bot: client.user.toString(),
    now: moment(new Date()).toLocaleString(),
    loaded: client.launchTime.toLocaleString(),
    shard: client.manager.id,
  });
}
