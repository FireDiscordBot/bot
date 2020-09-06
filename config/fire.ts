import { Fire } from "../lib/Fire";
import * as moment from "moment";

export const fire = {
  dev: process.env.NODE_ENV == "development",
  readyMessage: (client: Fire) => {
    client.console.log("-------------------------");
    client.console.log(
      `Bot: ${client?.user?.username}#${client?.user?.discriminator}`
    );
    client.console.log(`ID: ${client?.user?.id}`);
    client.console.log(`Guilds: ${client.guilds.cache.size}`);
    if (!client.started) {
      const now = moment();
      const duration = moment.duration(client.launchTime.diff(now));
      client.console.log(`Started in ${duration.humanize()}`);
    }
    client.console.log("-------------------------");
  },
};
