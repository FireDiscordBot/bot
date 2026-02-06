import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import {
  ClientOptions,
  Constants,
  Intents,
  Options,
  Sweepers,
  ThreadChannel,
} from "discord.js";

export const discord: ClientOptions = {
  allowedMentions: {
    repliedUser: false,
    parse: [],
    users: [],
    roles: [],
  },
  makeCache: Options.cacheWithLimits({
    // only keep non-archived threads
    ThreadManager: {
      maxSize: 1,
      keepOverLimit: (value) => !value.archived,
    },
    // @ts-ignore
    // same here
    GuildTextThreadManager: {
      maxSize: 1,
      keepOverLimit: (value: ThreadChannel) => !value.archived,
    },
    // same here (though idk why this doesn't need ts-ignore)
    GuildForumThreadManager: {
      maxSize: 1,
      keepOverLimit: (value: ThreadChannel) => !value.archived,
    },
    // 50 messages max per channel for non-plus guilds
    // 250 for plus guilds
    MessageManager: {
      maxSize: 50,
      keepOverLimit: (value: FireMessage, _, cache) => {
        if (value.paginator && !value.paginator.closed) return true;
        if (value.guild && value.guild.premium && cache.size < 250) return true;
        return false;
      },
    },
    GuildMemberManager: {
      // maxSize of 1 means we may have a single member
      // that isn't the bot or running a command
      maxSize: 1,
      keepOverLimit: (value: FireMember) =>
        value.id == value.client.user?.id ||
        value.client.isRunningCommand(value),
    },
    UserManager: {
      // same here
      maxSize: 1,
      keepOverLimit: (value: FireUser) =>
        value.id == value.client.user?.id ||
        value.client.isRunningCommand(value),
    },
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
        excludeFromSweep: (message: FireMessage) =>
          !!message.paginator && !message.paginator.closed,
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
  restRequestTimeout: 30000,
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
