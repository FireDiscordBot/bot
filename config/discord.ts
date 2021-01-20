import { constants } from "../lib/util/constants";
import { ClientOptions } from "discord.js";
const intents = constants.intents;

export const discord: ClientOptions = {
  allowedMentions: {
    parse: [],
    users: [],
    roles: [],
  },
  messageEditHistoryMaxSize: 1,
  messageCacheLifetime: 150,
  messageSweepInterval: 60,
  messageCacheMaxSize: 30,
  fetchAllMembers: false,
  restSweepInterval: 30,
  partials: ["REACTION", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "USER"],
  ws: {
    intents:
      intents.GUILDS |
      intents.GUILD_MEMBERS |
      intents.GUILD_PRESENCES |
      intents.GUILD_VOICE_STATES |
      intents.GUILD_BANS |
      intents.GUILD_INVITES |
      intents.GUILD_MESSAGES |
      intents.GUILD_MESSAGE_REACTIONS |
      intents.DIRECT_MESSAGES |
      intents.GUILD_VOICE_STATES,
  },
  presence: {
    activity: {
      name: "things load...",
      type: "WATCHING",
    },
    status: "idle",
  },
};
