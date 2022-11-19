import {
  ClientOptions,
  HTTPOptions,
  Constants,
  Intents,
  Options,
  Sweepers,
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
    ThreadManager: {
      sweepFilter: () => {
        return (thread) => thread.archived;
      },
      sweepInterval: 60,
    },
    GuildForumThreadManager: {
      sweepFilter: () => {
        return (thread) => thread.archived;
      },
      sweepInterval: 60,
    },
    // @ts-ignore
    GuildApplicationCommandManager: 0,
    ApplicationCommandManager: 0,
    BaseGuildEmojiManager: 0,
    StageInstanceManager: 0,
    GuildStickerManager: 0,
    ThreadMemberManager: 0,
    GuildInviteManager: 0,
    GuildEmojiManager: 0,
    GuildBanManager: 0,
    PresenceManager: 0,
  }),
  sweepers: {
    messages: {
      interval: 60,
      filter: Sweepers.filterByLifetime({
        lifetime: 150,
        getComparisonTimestamp: (message: FireMessage) =>
          message.editedTimestamp ?? message.createdTimestamp,
        excludeFromSweep: (message: FireMessage) => !!message.paginator,
      }),
    },
    users: {
      interval: 60,
      filter: () => (user: FireUser) =>
        user.id != user.client.user?.id && !user.client.isRunningCommand(user),
    },
    guildMembers: {
      interval: 60,
      filter: () => (member: FireMember) =>
        member.id != member.client.user?.id &&
        !member.client.isRunningCommand(member),
    },
    threads: {
      interval: 60,
      filter: () => (thread) => thread.archived,
    },
    voiceStates: {
      interval: 60,
      filter: () => (state) => state.channelId == null,
    },
  },
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
    Intents.FLAGS.GUILD_VOICE_STATES |
    Intents.FLAGS.MESSAGE_CONTENT,
  ...litecord,
  presence: {
    status: "idle",
    activities: [{ name: "things load...", type: "WATCHING" }],
  },
};
