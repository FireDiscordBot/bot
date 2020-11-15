import { constants } from "../lib/util/constants";
import { ClientOptions } from "discord.js";
const intents = constants.intents;

export const discord: ClientOptions = {
  allowedMentions: {
    parse: [],
    users: [],
    roles: [],
  },
  messageEditHistoryMaxSize: 2,
  messageCacheLifetime: 300,
  messageCacheMaxSize: 100,
  messageSweepInterval: 60,
  fetchAllMembers: false,
  partials: ["REACTION", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "USER"],
  ws: {
    intents:
      intents.GUILDS |
      intents.GUILD_MEMBERS |

      // I got presences for a feature I wanted to implement but
      // JESUS FUCKING CHRIST cpu usage & memory usage go brrrrr with it enabled
      // so for now it's getting yeeted (d.js would also cache all members with presences enabled idk why)
      // intents.GUILD_PRESENCES |

      intents.GUILD_BANS |
      intents.GUILD_INVITES |
      intents.GUILD_MESSAGES |
      intents.GUILD_MESSAGE_REACTIONS |
      intents.DIRECT_MESSAGES,
  },
  presence: {
    activity: {
      name: "things load...",
      type: "WATCHING",
    },
    status: "idle",
  },
};
