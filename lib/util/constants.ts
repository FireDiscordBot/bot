import humanizeDuration = require("humanize-duration");

export const constants = {
  emojis: {
    success: "<:check:674359197378281472>",
    error: "<:xmark:674359427830382603>",
    warning: "<a:fireWarning:660148304486727730>",
    // Yes these are the statuspage emotes but idc
    green: "<:operational:685538400639385649>",
    yellow: "<:partial_outage:685538400555499675>",
    red: "<:major_outage:685538400639385706>",
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
    discovery: "https://inv.wtf/discover",
    discordStatus: "https://discordstatus.com",
    fireStatus: "https://status.gaminggeek.dev",
  },
  regexes: {
    discord: {
      cdn: /https:\/\/cdn.discordapp.com\/attachments\/(?:\d){17,19}\/(?:\d){17,19}\/(?:.+?)(?:.png|.jpg)/i,
    },
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
  statuspage: {
    colors: {
      none: null,
      minor: "#f1c40f",
      major: "#e67e22",
      critical: "#e74c3c",
      maintenance: "#3498db",
    },
    emojis: {
      operational: "<:operational:685538400639385649>",
      degradedPerformance: "<:degraded_performance:685538400228343808>",
      partialOutage: "<:partial_outage:685538400555499675>",
      majorOutage: "<:major_outage:685538400639385706>",
      underMaintenance: "<:maintenance:685538400337395743>",
    },
  },
  discord: {
    regions: {
      brazil: "🇧🇷 Brazil",
      europe: "🇪🇺 Europe",
      hongkong: "🇭🇰 Hong Kong",
      india: "🇮🇳 India",
      japan: "🇯🇵 Japan",
      russia: "🇷🇺 Russia",
      singapore: "🇸🇬 Singapore",
      southafrica: "🇿🇦 South Africa",
      sydney: "🇦🇺 Sydney",
      "us-central": "🇺🇸 Central US",
      "us-south": "🇺🇸 US South",
      "us-east": "🇺🇸 US East",
      "us-west": "🇺🇸 US West",
    },
    features: {
      ENABLED_DISCOVERABLE_BEFORE: "Enabled Discoverable Before",
      WELCOME_SCREEN_ENABLED: "Welcome Screen",
      ANIMATED_ICON: "Animated Icon",
      INVITE_SPLASH: "Invite Splash",
      DISCOVERABLE: "[Discoverable](https://discord.com/guild-discovery)",
      MORE_EMOJI: "More Emoji",
      FEATURABLE: "Featurable",
      VANITY_URL: "Vanity URL",
      COMMUNITY: "[Community](https://dis.gd/communityservers)",
      PARTNERED: "[Partnered](https://dis.gd/partners)",
      COMMERCE: "[Store Channels](https://dis.gd/sellyourgame)",
      VERIFIED: "[Verified](https://dis.gd/vfs)",
      BANNER: "Banner",
      NEWS:
        "[Announcement Channels](https://support.discord.com/hc/en-us/articles/360032008192)",
      // CUSTOM FEATURES
      PREMIUM:
        "<:firelogo:665339492072292363> [Premium](https://gaminggeek.dev/premium)",
    },
  },
};

export const noop = () => {};

export const titleCase = (string: string) => {
  var sentence = string.toLowerCase().split(" ");
  for (var i = 0; i < sentence.length; i++) {
    sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
  }
  return sentence.join("");
};

export const zws = "\u200b";

export const humanize = (seconds: number) =>
  humanizeDuration(seconds, { largest: 2, delimiter: " and " });
