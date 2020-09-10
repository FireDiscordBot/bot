import { Fire } from "../lib/Fire";
import { humanize } from "../lib/util/constants";
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
    client.console.log(`Users: ${client.users.cache.size}`);
    if (!client.started) {
      const now = moment();
      const duration = client.launchTime.diff(now);
      client.console.log(`Started in ${humanize(duration, "en")}`);
    }
    client.console.log("-------------------------");
  },
};
