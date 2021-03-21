import { humanize } from "@fire/lib/util/constants";
import { Fire } from "@fire/lib/Fire";
import * as moment from "moment";

export const fire = {
  dev: process.env.NODE_ENV == "development",
  readyMessage: (client: Fire) => {
    client.console.log("-------------------------");
    client.console.log(`Bot: ${client.user}`);
    client.console.log(`ID: ${client.user?.id}`);
    client.console.log(`Guilds: ${client.guilds.cache.size.toLocaleString()}`);
    client.console.log(
      `Users: ${(client.guilds.cache.size >= 1
        ? client.guilds.cache
            .map((guild) => guild.memberCount || 0)
            .reduce((a, b) => a + b)
        : 0
      ).toLocaleString()}`
    );
    if (!client.started) {
      const now = moment();
      const duration = client.launchTime.diff(now);
      client.console.log(`Started in ${humanize(duration, "en")}`);
    }
    client.console.log("-------------------------");
  },
  aetherPingTimeout: 10000,
  fireGuildId: "564052798044504084",
  hasteLogEnabled: [
    "411619823445999637",
    "755794954743185438",
    "516977525906341928",
    "780181693100982273",
    "767833575185580062",
    "662109704549433380",
    "615923604424491035",
  ],
  inviteLink: process.env.INVITE_SUFFIX
    ? `https://inv.wtf/${process.env.INVITE_SUFFIX}`
    : "https://inv.wtf/bot",
};
