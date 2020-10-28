/* eslint-disable no-bitwise */
import { constants } from "../lib/util/constants";
import { ClientOptions } from "discord.js";
const intents = constants.intents;

export const discord: ClientOptions = {
  allowedMentions: {},
  messageCacheMaxSize: 2500,
  messageCacheLifetime: 60,
  messageSweepInterval: 120,
  fetchAllMembers: false,
  partials: ["REACTION", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "USER"],
  ws: {
    intents:
      intents.GUILDS |
      intents.GUILD_MEMBERS |
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
