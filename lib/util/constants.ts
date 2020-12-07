import humanizeDuration = require("humanize-duration");
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const getCategories = () => {
  const commandsFolder = resolve("src/commands");
  return readdirSync(commandsFolder).filter((name) =>
    statSync(join(commandsFolder, name)).isDirectory()
  );
};

export const constants = {
  emojis: {
    // shoutout to blobhub for the ebic emotes, https://inv.wtf/blobhub
    success: "<:yes:534174796888408074>",
    error: "<:no:534174796938870792>",
    warning: "<:maybe:534174796578160640>",
    // Yes these are the statuspage emotes but idc
    green: "<:operational:685538400639385649>",
    yellow: "<:partial_outage:685538400555499675>",
    red: "<:major_outage:685538400639385706>",
    badges: {
      DISCORD_EMPLOYEE: "<:DiscordStaff:698344463281422371>",
      PARTNERED_SERVER_OWNER: "<a:PartnerShine:750451997244915862>",
      HYPESQUAD_EVENTS: "<:HypesquadEvents:698349980192079882>",
      BUGHUNTER_LEVEL_1: "<:BugHunter:698350213596971049>",
      BUGHUNTER_LEVEL_2: "<:GoldBugHunter:698350544103669771>",
      EARLY_SUPPORTER: "<:EarlySupporter:698350657073053726>",
      VERIFIED_BOT:
        "<:verifiedbot1:700325427998097449><:verifiedbot2:700325521665425429>",
      EARLY_VERIFIED_BOT_DEVELOPER: "<:VerifiedBotDev:720179031785340938>",
      EARLY_VERIFIED_DEVELOPER: "<:VerifiedBotDev:720179031785340938>",
      PARTNERED: "<:PartnerWithBanner:748876805011931188>",
      VERIFIED: "<:VerifiedWithBanner:751196492517081189>",
      FIRE_ADMIN: "<:FireVerified:671243744774848512>",
      FIRE_PREMIUM: "<:FirePremium:680519037704208466>",
    },
  },
  statusEmojis: {
    online: "https://cdn.discordapp.com/emojis/775514569430663178.png?v=1",
    dnd: "https://cdn.discordapp.com/emojis/775514595951378452.png?v=1",
    idle: "https://cdn.discordapp.com/emojis/775514610925174784.png?v=1",
    offline: "https://cdn.discordapp.com/emojis/775514629811208252.png?v=1",
    streaming: "https://cdn.discordapp.com/emojis/775514644273954896.png?v=1",
  },
  reactions: {
    success: "yes:534174796888408074",
    error: "no:534174796938870792",
    warning: "maybe:534174796578160640",
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
      invite: /discord(?:app)?\.(?:com|gg)\/(?:invite\/)?(?<code>[a-zA-Z\d-]{1,25})/im,
      message: /(?:ptb.|canary.)?discord(?:app)?\.com\/channels(?:\/\d{15,21}){3}\/?/im,
    },
    invites: [
      /(?<domain>(?:dsc|dis|discord|invite)\.(?:gd|gg|io|me))\/(?<code>[a-zA-Z\d-]+)/gim,
      /(?<domain>(?:discord(?:app)?|watchanimeattheoffice)\.com)\/invite\/(?<code>[a-zA-Z\d-]+)/gim,
      /(?<domain>(?:h\.|i\.)?inv\.wtf)\/(?<code>[a-zA-Z\d-]+)/gim,
    ],
    paypal: /paypal\.me\/(?<name>[\w-]+)/gim,
    youtube: {
      channel: /youtube\.com\/(?:c\/|channel\/|user\/)?(?<channel>.+)/gim,
      video: /(youtube\.com|youtu\.be|invidio\.us)\/(?:[\w-]+\?v=|embed\/|v\/)?(?<video>[\w-]+)/gim,
    },
    twitch: {
      clip: /clips\.twitch\.tv\/(?<clip>\w+)/gim,
      channel: /twitch\.tv\/(?<channel>.+)/gim,
    },
  },
  blockedGifts: [
    "690195254191849478",
    "712716640940326962",
    "444871677176709141",
    "715594662257229848",
    "715724782011678821",
    "590547469624934410",
  ],
  allowedInvites: [
    // Below are guild ids of which invites for won't be deleted by the "discord" filter
    // They are servers that people may find helpful (e.g. discord-owned servers, programming servers etc.)

    // Pull requests to add to this list are welcome but will only be accepted if there is a legitimate reason
    // for invites to it to be filtered.

    // Official Servers
    "613425648685547541", // DDevs
    "197038439483310086", // Testers
    "169256939211980800", // Townhall
    "81384788765712384", // DAPI
    "670065151621332992", // Demo Server (do invites for this even exist anymore?)

    // Fire Discord
    "564052798044504084", // Fire

    // Programming / Discord Libraries
    "267624335836053506", // Python
    "336642139381301249", // Discord.py
    "508357248330760243", // TypeScript
    "222078108977594368", // Discord.JS
    "305153029567676426", // Akairo
    "749688635741437982", // Kotlin (unofficial)
    "125227483518861312", // JDA
    "745037351163527189", // Electron
  ],
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
      degraded_performance: "<:degraded_performance:685538400228343808>",
      partial_outage: "<:partial_outage:685538400555499675>",
      major_outage: "<:major_outage:685538400639385706>",
      under_maintenance: "<:maintenance:685538400337395743>",
    },
  },
  categoryNames: getCategories(),
};

export const titleCase = (string: string) =>
  string
    .toLowerCase()
    .split(" ")
    .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1))
    .join(" ");

export const zws = "\u200b";

export const humanize = (seconds: number, language: string) =>
  humanizeDuration(seconds, {
    largest: 2,
    delimiter: " and ",
    language: language,
    fallbacks: ["en"],
  });
