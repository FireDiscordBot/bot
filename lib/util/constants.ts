export const constants = {
  emojis: {
    success: "<:check:674359197378281472>",
    error: "<:xmark:674359427830382603>",
    warning: "<a:fireWarning:660148304486727730>",
  },
  reactions: {
    success: "check:674359197378281472",
    error: "xmark:674359427830382603",
    warning: "a:fireWarning:660148304486727730",
  },
  poll: {
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
    6: "6️⃣",
    7: "7️⃣",
    8: "8️⃣",
    9: "9️⃣",
    10: "🔟",
  },
  // urls
  url: {
    KSoftBans: "https://bans.ksoft.si/share",
    DiscordStatus: "https://status.discord.com",
    FireStatus: "https://status.gaminggeek.dev",
    FireVote: "https://fire-is-the.best/vote",
  },
  regexes: {
    discord: {
      cdn: /^https:\/\/cdn.discordapp.com\/attachments\/(?:\d){17,19}\/(?:\d){17,19}\/(?:.+?)(?:.png|.jpg)$/i,
    },
    cancel: /^(?:cancel|stop|end)$/i,
    emoji: new RegExp(`^${require("emoji-regex")().source}$`),
  },
  intents: {
    GUILDS: 1 << 0,
    GUILD_MEMBERS: 1 << 1,
    GUILD_BANS: 1 << 2,
    GUILD_EMOJIS: 1 << 3,
    GUILD_INTEGRATIONS: 1 << 4,
    GUILD_WEBHOOKS: 1 << 5,
    GUILD_INVITES: 1 << 6,
    GUILD_VOICE_STATES: 1 << 7,
    GUILD_PRESENCES: 1 << 8,
    GUILD_MESSAGES: 1 << 9,
    GUILD_MESSAGE_REACTIONS: 1 << 10,
    GUILD_MESSAGE_TYPING: 1 << 11,
    DIRECT_MESSAGES: 1 << 12,
    DIRECT_MESSAGE_REACTIONS: 1 << 13,
    DIRECT_MESSAGE_TYPING: 1 << 14,
  },
};

export const noop = () => {};

export const zws = "\u200B";
