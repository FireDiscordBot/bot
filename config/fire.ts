import { humanize } from "@fire/lib/util/constants";
import { Snowflake } from "discord.js";
import { Fire } from "@fire/lib/Fire";
import * as moment from "moment";

export const fire = {
  dev:
    process.env.NODE_ENV == "development" || process.env.NODE_ENV == "staging",
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
  fireGuildId: "564052798044504084" as Snowflake,
  hasteLogEnabled: [
    "411619823445999637",
    "755794954743185438",
    "516977525906341928",
    "780181693100982273",
    "767833575185580062",
    "615923604424491035",
    "807302538558308352",
    "450878205294018560",
    "834131361836433420",
    "804143990869590066",
    "683466844279275520",
    "742112973799293011",
    "781913473872560189",
  ],
  datamineUsers: [
    "GamingGeek",
    "ThaTiemsz",
    "advaith1",
    "ItsRauf",
    "ilikepotatoes121",
    "itzoreomc",
    "DeJayDev",
    "areyouokevan",
    "KarateWumpus",
    "webhp",
    "DrewTheGhost",
    "vDelite",
    "NurMarvin",
    "XYZenix",
    "RedDaedalus",
    "justsomederpystuff",
    "webtax-gh",
  ],
  inviteLink: process.env.INVITE_SUFFIX
    ? `https://inv.wtf/${process.env.INVITE_SUFFIX}`
    : "https://inv.wtf/bot",
  // extras used in the user command to set specific colors for Fire bots & other cool bots
  // it's an object to allow for adding other data in the future if needed
  bots: {
    // Fire
    "444871677176709141": {
      color: "#D33035",
      best: true,
    },
    // Fire Beta
    "764995504526327848": {
      color: "#3178C6",
      best: true,
    },
    // Fire Dev
    "627625765227462656": {
      color: "#FFFFFF",
      best: true,
    },
    // Status
    "711035674723221574": {
      color: "#7BCBA7",
    },
    // Status Dev
    "795024264834449419": {
      color: "#F04847",
    },
    // inv.wtf (purely used for increased rate limits fetching invites)
    "710379799150854166": {
      color: "#FFFFFF",
    },
    // Groovy
    "234395307759108106": {
      color: "#78A4FA",
    },
    // Groovy 2
    "368424172730187786": {
      color: "#4CCC67",
    },
    // Groovy 3
    "287378523843198976": {
      color: "#F9F97A",
    },
    // Patreon
    "216303189073461248": {
      color: "#F96854",
    },
    // Suggester
    "564426594144354315": {
      color: "#7289D9",
    },
    // Aero Staging
    "612228762330726411": {
      color: "#F2BFF5",
    },
    // Aero
    "432129282710700033": {
      color: "#BFCBF5",
    },
    // Shirt Bot
    "561514414675853312": {
      color: "#7389DC",
    },
    // Tatsu
    "172002275412279296": {
      color: "#17A166",
    },
    // Rythm
    "235088799074484224": {
      color: "#FB0F32",
    },
    // Rythm 2
    "252128902418268161": {
      color: "#0070FF",
    },
    // Rythm 3
    "814675737331105832": {
      color: "#DB00FF",
    },
    // Rythm 4
    "814675803065155585": {
      color: "#46AF2C",
    },
    // Rythm 5
    "814675864859836417": {
      color: "#33BED1",
    },
    // Rythm Canary
    "415062217596076033": {
      color: "#FBAB0F",
    },
  },
};
