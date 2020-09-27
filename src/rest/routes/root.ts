import * as express from "express";
import * as moment from "moment";

import {ResponseLocals} from "../interfaces";

export function rootRoute(req: express.Request, res: express.Response) {
  const {client} = res.locals as ResponseLocals;
  const body = {
    success: true,
    bot: client.user.toString(),
    now: moment(new Date()).toLocaleString(),
    loaded: client.launchTime.toLocaleString(),
    shard: client.manager.id,
  };
  res.status(200).send(body);
}
