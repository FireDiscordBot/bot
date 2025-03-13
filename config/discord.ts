import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import {
  ClientOptions,
  Constants,
  Intents,
  Options,
  Sweepers,
} from "discord.js";

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
      maxSize: 1000,
    },
    // @ts-ignore
    GuildTextThreadManager: {
      sweepFilter: () => {
        return (thread) => thread.archived;
      },
      sweepInterval: 60,
      maxSize: 1000,
    },
    GuildForumThreadManager: {
      sweepFilter: () => {
        return (thread) => thread.archived;
      },
      sweepInterval: 60,
      maxSize: 1000,
    },
    // GuildChannelManager: {
    //   sweepFilter: () => {
    //     return (channel) => channel.isThread() && channel.archived;
    //   },
    //   sweepInterval: 60,
    //   maxSize: 1500, // 500 channels + 1000 active threads
    //   keepOverLimit: (channel) => !channel.isThread(), // keep normal channels over limit
    // },
    // ChannelManager: {
    //   sweepFilter: () => {
    //     return (channel) => channel.isThread() && channel.archived;
    //   },
    //   sweepInterval: 60,
    //   maxSize: 1, // needs to be any number > 0 for keepOverLimit to work
    //   keepOverLimit: (channel) => !channel.isThread(), // only keep non-threads in global channel cache
    // },
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
  presence: {
    status: "idle",
    activities: [{ name: "things load...", type: "WATCHING" }],
  },
};
