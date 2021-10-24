import {
  ClientOptions,
  HTTPOptions,
  Constants,
  Intents,
  Options,
} from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";

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
    repliedUser: false,
    parse: [],
    users: [],
    roles: [],
  },
  makeCache: Options.cacheWithLimits({
    MessageManager: {
      sweepFilter: () => {
        return (message: FireMessage) =>
          +new Date() - (message.editedTimestamp ?? message.createdTimestamp) >
          150000;
      },
      keepOverLimit: (message: FireMessage) =>
        !message.author?.bot || !!message.paginator,
      sweepInterval: 60,
      maxSize: 100,
    },
    GuildMemberManager: {
      sweepFilter: () => {
        return (member: FireMember) =>
          member.id != member.client.user?.id &&
          !member.client.isRunningCommand(member);
      },
      sweepInterval: 60,
    },
    UserManager: {
      sweepFilter: () => {
        return (user: FireUser) =>
          user.id != user.client.user?.id &&
          !user.client.isRunningCommand(user);
      },
      sweepInterval: 60,
    },
    // @ts-ignore
    GuildApplicationCommandManager: 0,
    ApplicationCommandManager: 0,
    BaseGuildEmojiManager: 0,
    StageInstanceManager: 0,
    GuildStickerManager: 0,
    GuildInviteManager: 0,
    GuildEmojiManager: 0,
    GuildBanManager: 0,
    PresenceManager: 0,
  }),
  restRequestTimeout: 15000,
  restSweepInterval: 60,
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
