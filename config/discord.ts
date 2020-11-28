import { constants } from "../lib/util/constants";
import { ClientOptions } from "discord.js";
const intents = constants.intents;

export const discord: ClientOptions = {
  allowedMentions: {
    parse: [],
    users: [],
    roles: [],
    // @ts-ignore
    replied_user: false,
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
      intents.GUILD_PRESENCES |
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
