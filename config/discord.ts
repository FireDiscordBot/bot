import { ClientOptions, HTTPOptions } from "discord.js";
import { constants } from "@fire/lib/util/constants";
const intents = constants.intents;

let litecord: { http?: HTTPOptions } = {};
if (process.env.USE_LITECORD == "true")
  litecord = {
    http: {
      api: process.env.LITECORD_HOST,
      cdn: process.env.LITECORD_CDN,
      version: parseInt(process.env.LITECORD_VERSION),
    },
  };

export const discord: ClientOptions = {
  allowedMentions: {
    parse: [],
    users: [],
    roles: [],
    repliedUser: false,
  },
  messageCacheLifetime: 150,
  messageSweepInterval: 60,
  messageCacheMaxSize: 30,
  restSweepInterval: 30,
  partials: ["REACTION", "MESSAGE", "CHANNEL", "GUILD_MEMBER", "USER"],
  intents:
    intents.GUILDS |
    intents.GUILD_MEMBERS |
    // intents.GUILD_PRESENCES |
    intents.GUILD_VOICE_STATES |
    intents.GUILD_BANS |
    intents.GUILD_INVITES |
    intents.GUILD_MESSAGES |
    intents.GUILD_MESSAGE_REACTIONS |
    intents.GUILD_WEBHOOKS |
    intents.DIRECT_MESSAGES |
    intents.GUILD_VOICE_STATES,
  ...litecord,
};
