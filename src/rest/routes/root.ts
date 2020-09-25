import { ResponseLocals } from "../interfaces";
import * as express from "express";
import * as moment from "moment";

export async function rootRoute(req: express.Request, res: express.Response) {
  const locals: ResponseLocals = res.locals as ResponseLocals;
  const body = {
    success: true,
    bot: locals.client.user.toString(),
    now: moment(new Date()).toLocaleString(),
    loaded: locals.client.launchTime.toLocaleString(),
    shard: locals.client.manager.id,
  };
  res.status(200).send(body);
}
