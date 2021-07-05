import {
  LimitedCollection,
  ClientOptions,
  HTTPOptions,
  Collection,
  Constants,
  Intents,
} from "discord.js";

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
  makeCache: (manager) => {
    if (manager.name == "MessageManager") return new LimitedCollection(30);
    else if (manager.name == "PresenceManager") return new LimitedCollection(0);
    return new Collection();
  },
  messageCacheLifetime: 150,
  messageSweepInterval: 60,
  // messageCacheMaxSize: 30,
  restSweepInterval: 30,
  partials: [
    Constants.PartialTypes.GUILD_MEMBER,
    Constants.PartialTypes.REACTION,
    Constants.PartialTypes.MESSAGE,
    Constants.PartialTypes.CHANNEL,
    Constants.PartialTypes.USER,
  ],
  intents:
    Intents.FLAGS.GUILDS |
    Intents.FLAGS.GUILD_MEMBERS |
    // Intents.FLAGS.GUILD_PRESENCES |
    Intents.FLAGS.GUILD_VOICE_STATES |
    Intents.FLAGS.GUILD_BANS |
    Intents.FLAGS.GUILD_INVITES |
    Intents.FLAGS.GUILD_MESSAGES |
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS |
    Intents.FLAGS.GUILD_WEBHOOKS |
    Intents.FLAGS.DIRECT_MESSAGES |
    Intents.FLAGS.GUILD_VOICE_STATES,
  ...litecord,
  presence: {
    status: "idle",
    activities: [{ name: "things load...", type: "WATCHING" }],
  },
};
