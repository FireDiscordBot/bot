import {
  BaseMessageComponentOptions,
  MessageActionRow,
  MessageActionRowOptions,
  MessageMentionOptions,
  NewsChannel,
  ReplyOptions,
} from "discord.js";
import { StringMap, TOptions } from "i18next";
import { FireTextChannel } from "../extensions/textchannel";
import { FireVoiceChannel } from "../extensions/voicechannel";
import humanizeDuration = require("humanize-duration");
import { FireGuild } from "../extensions/guild";
import { Language } from "./language";

const emojiRegex = require("emoji-regex")() as RegExp;
const emojiRegexStr = emojiRegex.toString();

export enum CouponType {
  BOOSTER = "BOOSTER",
  TWITCHSUB = "TWITCHSUB",
  BOOSTER_AND_SUB = "TWITCHBOOST",
}

export enum ActionLogTypes {
  SYSTEM,
  PURGE = 1 << 0,
  LINKFILTER_TRIGGERED = 1 << 1,
  MESSAGE_EDIT = 1 << 2,
  MESSAGE_DELETE = 1 << 3,
  INVITE_ROLE_CREATE = 1 << 4,
  INVITE_ROLE_DELETE = 1 << 5,
  CHANNEL_CREATE = 1 << 6,
  CHANNEL_UPDATE = 1 << 7,
  CHANNEL_DELETE = 1 << 8,
  INVITE_CREATE = 1 << 9,
  INVITE_DELETE = 1 << 10,
  GUILD_UPDATE = 1 << 11,
  USER_UNBAN = 1 << 12,
  PINS_ADD = 1 << 13,
  REACTION_ROLE = 1 << 14,
}
export const DEFAULT_ACTION_LOG_FLAGS = Object.values(ActionLogTypes)
  .filter((v) => typeof v == "number")
  .reduce((a, b: ActionLogTypes) => a | b, 0);
export enum ModLogTypes {
  SYSTEM,
  WARN = 1 << 0,
  NOTE = 1 << 1,
  BAN = 1 << 2,
  UNBAN = 1 << 3,
  KICK = 1 << 4,
  BLOCK = 1 << 5,
  UNBLOCK = 1 << 6,
  DERANK = 1 << 7,
  MUTE = 1 << 8,
  UNMUTE = 1 << 9,
  ROLE_PERSIST = 1 << 10,
  BLACKLIST = 1 << 11,
  UNBLACKLIST = 1 << 12,
}
export const DEFAULT_MOD_LOG_FLAGS = Object.values(ModLogTypes)
  .filter((v) => typeof v == "number")
  .reduce((a, b: ModLogTypes) => a | b, 0);
export enum MemberLogTypes {
  SYSTEM,
  JOIN = 1 << 0,
  LEAVE = 1 << 1,
  ROLES_ADD = 1 << 2,
  ROLES_REMOVE = 1 << 3,
  MEMBER_UPDATE = 1 << 4,
}
export const DEFAULT_MEMBER_LOG_FLAGS = Object.values(MemberLogTypes)
  .filter((v) => typeof v == "number")
  .reduce((a, b: MemberLogTypes) => a | b, 0);

export const ModLogTypesEnumToString: Record<ModLogTypes, string> = {
  [ModLogTypes.SYSTEM]: "system", // only here to please the typings, should never be used
  [ModLogTypes.WARN]: "warn",
  [ModLogTypes.NOTE]: "note",
  [ModLogTypes.BAN]: "ban",
  [ModLogTypes.UNBAN]: "unban",
  [ModLogTypes.KICK]: "kick",
  [ModLogTypes.BLOCK]: "block",
  [ModLogTypes.UNBLOCK]: "unblock",
  [ModLogTypes.DERANK]: "derank",
  [ModLogTypes.MUTE]: "mute",
  [ModLogTypes.UNMUTE]: "unmute",
  [ModLogTypes.ROLE_PERSIST]: "role_persist",
  [ModLogTypes.BLACKLIST]: "blacklist",
  [ModLogTypes.UNBLACKLIST]: "unblacklist",
};

export type LinkfilterExcluded = LinkfilterExcludedItem[];

export type LinkfilterExcludedItem =
  | `role:${string}`
  | `channel:${string}`
  | `user:${string}`;

export type GuildTextChannel = FireTextChannel | FireVoiceChannel | NewsChannel;

export type i18nOptions = TOptions<StringMap> & {
  components?: (
    | MessageActionRow
    | (Required<BaseMessageComponentOptions> & MessageActionRowOptions)
  )[];
  allowedMentions?: MessageMentionOptions;
  reply?: ReplyOptions;
  includeSlashUpsell?: boolean;
};

export type CommonContext = { guild?: FireGuild; language: Language };

// errors thrown by the base command class exec & run methods telling you to use the other method
export class UseExec extends Error {}
export class UseRun extends Error {}

let emojis = {
  // shoutout to blobhub for the ebic emotes, https://inv.wtf/blobhub
  success: "<:yes:534174796888408074>",
  error: "<:no:534174796938870792>",
  slashError: "<:error:837406115280060505>",
  warning: "<:maybe:534174796578160640>",
  statuspage: {
    operational: "<:operational:685538400639385649>",
    degraded_performance: "<:degraded_performance:685538400228343808>",
    partial_outage: "<:partial_outage:685538400555499675>",
    major_outage: "<:major_outage:685538400639385706>",
    under_maintenance: "<:maintenance:685538400337395743>",
  },
  badges: {
    DISCORD_EMPLOYEE: "<:DiscordStaff:844154550402809916>",
    PARTNERED_SERVER_OWNER: "<:partnericon:844154710637805580>",
    HYPESQUAD_EVENTS: "<:HypesquadEvents:698349980192079882>",
    BUGHUNTER_LEVEL_1: "<:BugHunter:844155858354962432>",
    BUGHUNTER_LEVEL_2: "<:GoldBugHunter:698350544103669771>",
    EARLY_SUPPORTER: "<:EarlySupporter:698350657073053726>",
    VERIFIED_BOT:
      "<:verifiedbot1:943307495319937094><:verifiedbot2:943307562604978187>",
    EARLY_VERIFIED_BOT_DEVELOPER: "<:VerifiedBotDev:720179031785340938>",
    DISCORD_CERTIFIED_MODERATOR: "<:CertifiedModerator:844189980305653790>",
    PARTNERED: "<:PartnerWithBanner:844154648680071189>",
    VERIFIED: "<:VerifiedWithBanner:751196492517081189>",
    OWNER: "<:ownercrown:831858918161776661>",
    FIRE_ADMIN: "<:FireVerified:671243744774848512>",
    FIRE_PREMIUM: "<:FirePremium:680519037704208466>",
    FUCK_MEE6: "<:fuckmee6allmyhomieshatemee6:909928935310118992>",
  },
  channels: {
    text: "<:channeltext:794243232648921109>",
    voice: "<:channelvoice:794243248444407838>",
    stage: "<:channelstage:831890012366307379>",
    news: "<:channelannouncements:794243262822350919>",
  },
};

let reactions = {
  success: "yes:534174796888408074",
  error: "no:534174796938870792",
  warning: "maybe:534174796578160640",
};

// e.g. for litecord
if (process.env.EMOJI_SET == "1") {
  emojis = {
    ...emojis,
    success: "<:yes:823119635246350338>",
    error: "<:no:823119661787906050>",
    warning: "<:maybe:823119649234354181>",
    statuspage: {
      operational: "<:operational:823120412668985344>",
      degraded_performance: "<:degraded_performance:823244090849230848>",
      partial_outage: "<:partial_outage:823120413453320192>",
      major_outage: "<:major_outage:823120412668985345>",
      under_maintenance: "<:maintenance:823244090849230849>",
    },
    badges: {
      DISCORD_EMPLOYEE: "<:DiscordStaff:823121736273887237>",
      PARTNERED_SERVER_OWNER: "<a:PartnerShine:823121735774765059>",
      HYPESQUAD_EVENTS: "<:HypesquadEvents:823121736273887233>",
      BUGHUNTER_LEVEL_1: "<:BugHunter:823121736273887236>",
      BUGHUNTER_LEVEL_2: "<:GoldBugHunter:823122047726125056>",
      EARLY_SUPPORTER: "<:EarlySupporter:823121736273887232>",
      VERIFIED_BOT:
        "<:verifiedbot1:823121735774765057><:verifiedbot2:823121736273887239>",
      EARLY_VERIFIED_BOT_DEVELOPER: "<:VerifiedBotDev:823121736273887234>",
      DISCORD_CERTIFIED_MODERATOR: "<:CertifiedModerator:844189980305653790>",
      PARTNERED: "<:PartnerWithBanner:823121736273887238>",
      VERIFIED: "<:VerifiedWithBanner:823121735774765058>",
      OWNER: "",
      FIRE_ADMIN: "<:FireVerified:823121736273887240>",
      FIRE_PREMIUM: "<:FirePremium:823121735774765056>",
      FUCK_MEE6: "<:fuckmee6allmyhomieshatemee6:823121735774765060>",
    },
    channels: {
      text: "<:channeltext:823154571105927169>",
      voice: "<:channelvoice:823154571105927168>",
      stage: "",
      news: "<:channelannouncements:823154571105927170>",
    },
  };

  reactions = {
    ...reactions,
    success: "yes:823119635246350338",
    error: "no:823119661787906050",
    warning: "maybe:823119649234354181",
  };
}

export const constants = {
  emojis,
  statusEmojis: {
    online: "https://cdn.discordapp.com/emojis/775514569430663178.png?v=1",
    dnd: "https://cdn.discordapp.com/emojis/775514595951378452.png?v=1",
    idle: "https://cdn.discordapp.com/emojis/775514610925174784.png?v=1",
    offline: "https://cdn.discordapp.com/emojis/775514629811208252.png?v=1",
    streaming: "https://cdn.discordapp.com/emojis/775514644273954896.png?v=1",
  },
  reactions,
  // urls
  url: {
    discovery: "https://getfire.bot/discover",
    discordStatus: "https://discordstatus.com",
    fireStatus: "https://firestatus.link",
    website: "https://getfire.bot/",
    terms: "https://inv.wtf/terms",
    privacy: "https://inv.wtf/privacy",
    premium: "https://inv.wtf/premium",
    support: "https://inv.wtf/fire",
    // selfhosted instance of https://git.farfrom.earth/aero/imagegen (but with profile removed since I don't need it)
    imageGen: "https://gen.inv.wtf/",
    supportedHaste: ["hastebin.com", "hasteb.in", "hst.sh"],
    automodAvatar: "https://static.inv.wtf/discord_automod.png",
  },
  imageExts: [".png", ".jpg", ".jpeg", ".gif", ".gifv"],
  audioExts: ["mp3", "wav", "flac", "alac", "m4a"],
  videoExts: ["mp4", "mkv", "mov"],
  regexes: {
    maskedLink: /\[(?<name>.+)\]\((?<link><?https?:\/\/.+>?)\)/gim,
    symbol: /<|>|\`|\*|~|#|!|"|\(|\)|\[|]|\{|\}|;|\'|/gim,
    spoilerAbuse:
      /(?:\|\|?[\u180E\u2000-\u2009\u200A-\u200F\u202F\u2028\u2060\uFEFF]?){20,}/gim,
    zws: /[\u1CBC\u180E\u2000-\u2009\u200A-\u200F\u202F\u2028\u2060\uFEFF]/gim,
    customEmoji: /<a?:(?<name>[a-zA-Z0-9\_]+):(?<id>\d{15,21})>/gim,
    unicodeEmoji: emojiRegex,
    allEmoji: new RegExp(
      "(" +
        emojiRegexStr.slice(1, emojiRegexStr.length - 2) +
        "|<a?:(?<name>[a-zA-Z0-9\\_]+):(?<id>\\d{15,21})>)",
      "gim"
    ),
    URL: /https?:\/\/([^\/?#]*)([^?#]*)(\?([^#]*))?(#(.*))?/gim,
    protocol: /\w{1,10}:\/\//gim,
    joinleavemsgs: {
      user: /{user}/gim,
      mention: /{user\.mention}/gim,
      name: /{user\.(?:user)?name}/gim,
      discrim: /{user\.discrim(?:inator)?}/gim,
      guild: /{(?:guild|server)}/gim,
      count: /{count}/gim,
      countSuffix: /{count\.suffix}/gim,
    },
    invwtf: /inv\.wtf\/(?<code>[\w-]{2,25})/gim,
    discord: {
      invite:
        /discord(?:app)?\.(?:com|gg)\/(?:invite\/)?(?<code>[\w-]{1,25})/gim,
      cdnEmoji:
        /^https?:\/\/cdn\.discordapp\.com\/emojis\/(\d{15,21})\.\w{3,4}(?:\?v=\d|\?size=\d{1,4})?/gim,
      cdnAttachment:
        /^https?:\/\/cdn\.discordapp\.com\/attachments\/\d{15,21}\/\d{15,21}\/\w*\.\w{3,4}/im,
      message:
        /(?:ptb\.|canary\.|staging\.|lc\.)?(?:discord(?:app)?|inv)\.(?:com|wtf)?\/channels\/(?<guild_id>\d{15,21}|@me)\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})/im,
      messageGlobal:
        /<?(?:ptb\.|canary\.|staging\.)?discord(?:app)?\.com?\/channels\/(?<guild_id>\d{15,21})\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})>?/gim,
      webhook:
        /discord(?:app)?\.com\/api\/(?:v\d{1,2}\/)?webhooks\/(?<id>\d{15,21})\/(?<token>[\w-]{50,80})(?<thread>\?thread_id=(?<threadId>\d{15,21}))?/im,
    },
    invites: [
      /(?<domain>(?:dsc|dis|discord|invite)\.(?:gd|gg|io|me))\/(?<code>[\w-]+)/gim,
      /(?<domain>(?:discord(?:app)?|watchanimeattheoffice)\.com)\/(?:invites?|friend-invites?)\/(?<code>[\w-]+)/gim,
      /(?<domain>(?:h\.|i\.)?inv\.wtf)\/(?<code>[\w-]+)/gim,
    ],
    paypal: /(?:paypal\.me|paypal\.com\/paypalme)\/(?<name>[\w-]+)/im,
    youtube: {
      channel: /youtube\.com\/(?:c\/|channel\/|user\/)?(?<channel>[^"\s]+)/im,
      video:
        /(youtu\.be\/|invidio\.us\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/clip\/)(?<video>[\w-]+)/im,
    },
    twitch: {
      clip: /clips\.twitch\.tv\/(?<clip>\w+)/im,
      channel: /twitch\.tv\/(?<channel>.+)/im,
    },
    twitter:
      /twitter\.com\/(?<username>\w+)(?:\/status\/(?<tweet>\d+)?|\/(?<path>likes|media|with_replies|followers|following|suggested))?/im,
    imageURL:
      /((?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*(?:\.png|\.jpg|\.jpeg|\.gif|\.gifv|\.webp)))/im,
    time: {
      phrasing: [
        /(?:me to (?<reminder>.+) in | ?me in | ?in )? (?:(?<months>\d+)(?: ?months?| ?mos?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )? (?:(?<weeks>\d+)(?: ?w(?:ee)?k?s?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )? (?:(?<days>\d+)(?: ?d(?:ay)?s?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )? (?:(?<hours>\d+)(?: ?h(?:(?:ou)?rs?)?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )? (?:(?<minutes>\d+)(?: ?m(?:in)?(?:utes?)?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )? (?:(?<seconds>\d+)(?: ?s(?:ec)?(?:onds?)?))(?: ?about | ?that | ?to )?/im,
      ],
      month: / (?<months>\d+)(?: ?months?| ?mos?)/im,
      week: / (?<weeks>\d+)(?: ?w(?:ee)?k?s?)/im,
      day: / (?<days>\d+)(?: ?d(?:ay)?s?)/im,
      hours: / (?<hours>\d+)(?: ?h(?:(?:ou)?rs?)?)/im,
      minutes: / (?<minutes>\d+)(?: ?m(?:in)?(?:utes?)?)/im,
      seconds: / (?<seconds>\d+)(?: ?s(?:ec)?(?:onds?)?)/im,
    },
    haste:
      /(?<uploader>toptal\.com\/developers\/hastebin|hastebin\.com|hasteb\.in|hst\.sh|h\.inv\.wtf)\/(?<key>\w{1,20})/gim,
  },
  escapedShruggie: "¯\\_(ツ)_/¯",
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
    "917882129487134730", // Snowsgaming
    "81384788765712384", // DAPI
    "670065151621332992", // Demo Server (do invites for this even exist anymore?)
    "831646372519346186", // Poker Night

    // Fire Discord
    "564052798044504084", // Fire

    // Programming / Discord Libraries
    "267624335836053506", // Python
    "336642139381301249", // Discord.py
    "508357248330760243", // TypeScript
    "222078108977594368", // Discord.JS
    "305153029567676426", // Akairo
    "749688635741437982", // Kotlin (unofficial)
    "269508806759809042", // Elixir
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
  },
  mcLogFilters: [
    "ERROR]: The mcmod.info file in [1.8.9] Powns ToggleSneak - 3.0.jar cannot be parsed as valid JSON. It will be ignored",
    "Calling tweak class net.minecraftforge.fml.relauncher.CoreModManager$FMLPluginWrapper",
    "[Client thread/WARN]: =============================================================",
    "MOD HAS DIRECT REFERENCE System.exit() THIS IS NOT ALLOWED REROUTING TO FML!",
    "[net.canelex.perspectivemod.asm.OrientCameraVisitor:visitFieldInsn:37]:",
    "[me.powns.lavafix.asm.TryPlaceContainedLiquidVisitor:visitMethodInsn:15",
    "me.powns.potioncolorizer.asm.ItemPotionTransformer$1:visitMethod:20",
    "me.powns.lavafix.asm.PlayerControllerMPTransformer$1:visitMethod:22",
    "[club.sk1er.patcher.tweaker.PatcherTweaker:detectIncompatibleMods",
    "com.connorlinfoot.discordrp.Servers.Hypixel.HypixelGames:load:25",
    "me.powns.lavafix.asm.OnPlayerRightClickVisitor:visitVarInsn:22",
    "[OptiFine] CustomSky: Texture not found: minecraft:mcpatcher/",
    "[kr.syeyoung.dungeonsguide.DungeonsGuide:lambda$connectStomp",
    "me.powns.lavafix.asm.ItemBucketTransformer$1:visitMethod:22",
    "[SkyblockAddons - #0/INFO]: [SkyblockAddons/SkyblockAddons/",
    "Using missing texture, unable to load minecraft:mcpatcher/",
    "[kr.syeyoung.dungeonsguide.stomp.StompPayload:getBuilt:57]",
    "[kr.syeyoung.dungeonsguide.stomp.StompClient:onError:143]",
    "Offendor: com/sun/jna/Native.main([Ljava/lang/String;)V",
    "Error downloading auction from Moulberry's jank API. :(",
    "[skytils.skytilsmod.utils.APIUtil:getJSONResponse:99]:",
    "com.connorlinfoot.discordrp.LinfootUpdater:doCheck:44",
    "[skytils.skytilsmod.core.PersistentSave:readSave:53]",
    "[club.sk1er.mods.core.util.WebUtil:fetchString:31]:",
    "[Client thread/INFO]: [kr.syeyoung.dungeonsguide.",
    "[io.github.moulberry.hychat.HyChat:preinit:106]:",
    "[Client thread/INFO]: Found 1 transformers for ",
    "[io.github.moulberry.hychat.chat.ChatRegexes",
    "[OptiFine] (Reflector) Class not present:",
    "Use FMLCommonHandler.exitJava instead",
    "has a security seal for path org.lwjgl",
    "Needed to grow BufferBuilder buffer: ",
    "[SkyblockExtras] Distance to vector:",
    "[optifine.OptiFineForgeTweaker:dbg",
    "[OptiFine] Scaled non power of 2:",
    "Applying AsmWriter InjectWriter",
    "ModCoreInstaller:isInitalized",
    "[main/INFO]: Mixing Mixin",
    "[OptiFine] BetterGrass:",
    "Colormap mcpatcher/",
    "[OptiFine] *** Re",
    "[OptiFine] Mipmap",
    "[OptiFine] Multi",
    "[main/DEBUG]:",
    "[main/TRACE]:",
    ": mcpatcher/",
  ],
};

export const titleCase = (
  string: string,
  separator = " ",
  joinWithSpace = true
) =>
  string
    .toLowerCase()
    .split(separator)
    .map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1))
    .join(joinWithSpace ? " " : "");

export const zws = "\u200b";

export const humanize = (ms: number, language: string) =>
  humanizeDuration(ms, {
    largest: 3,
    delimiter: ", ",
    language: language,
    fallbacks: ["en"],
  });

export const parseTime = (content: string, replace: boolean = false) => {
  if (!content && !replace) return 0;
  else if (!content) return content;
  const {
    regexes: { time: regexes },
  } = constants;
  // to try reduce false positives for the time
  // it requires a space before the time
  // so here we add a space before the content
  // in case the time is at the start
  content = " " + content;
  if (replace) {
    for (const phrase of regexes.phrasing) {
      const match = phrase.exec(content);
      phrase.lastIndex = 0;
      content = content.replace(phrase, match?.groups?.reminder || "");
    }
    // trimStart here will remove the space we added earlier
    return content.replace(/\s{2,}/gim, " ").trimStart();
  }
  const matches = {
    months: regexes.month.exec(content)?.groups?.months,
    weeks: regexes.week.exec(content)?.groups?.weeks,
    days: regexes.day.exec(content)?.groups?.days,
    hours: regexes.hours.exec(content)?.groups?.hours,
    minutes: regexes.minutes.exec(content)?.groups?.minutes,
    seconds: regexes.seconds.exec(content)?.groups?.seconds,
  };
  let minutes = parseInt(matches.minutes || "0");
  if (matches.seconds) minutes += parseInt(matches.seconds || "0") / 60;
  if (matches.hours) minutes += parseInt(matches.hours || "0") * 60;
  if (matches.days) minutes += parseInt(matches.days || "0") * 1440;
  if (matches.weeks) minutes += parseInt(matches.weeks || "0") * 10080;
  if (matches.months) minutes += parseInt(matches.months || "0") * 43800;

  return minutes;
};

export const pluckTime = (content: string) => {
  if (!content) return null;
  else if (!content) return content;
  const {
    regexes: { time: regexes },
  } = constants;
  // to try reduce false positives for the time
  // it requires a space before the time
  // so here we add a space before the content
  // in case the time is at the start
  content = " " + content;
  const matches = [
    [regexes.month.exec(content)?.groups?.months, "mo"],
    [regexes.week.exec(content)?.groups?.weeks, "w"],
    [regexes.day.exec(content)?.groups?.days, "d"],
    [regexes.hours.exec(content)?.groups?.hours, "h"],
    [regexes.minutes.exec(content)?.groups?.minutes, "m"],
    [regexes.seconds.exec(content)?.groups?.seconds, "s"],
  ]
    .filter((match) => !!match[0])
    .map(([match, unit]) => match + unit);
  return matches.join(" ");
};

export const shortURLs = [
  "0rz.tw",
  "1link.in",
  "1url.com",
  "2.gp",
  "2big.at",
  "2tu.us",
  "3.ly",
  "307.to",
  "4ms.me",
  "4sq.com",
  "4url.cc",
  "6url.com",
  "7.ly",
  "a.gg",
  "a.nf",
  "aa.cx",
  "abcurl.net",
  "ad.vu",
  "adf.ly",
  "adjix.com",
  "afx.cc",
  "all.fuseurl.com",
  "alturl.com",
  "amzn.to",
  "ar.gy",
  "arst.ch",
  "atu.ca",
  "azc.cc",
  "b23.ru",
  "b2l.me",
  "bacn.me",
  "bcool.bz",
  "binged.it",
  "bit.ly",
  "bizj.us",
  "bloat.me",
  "bravo.ly",
  "bsa.ly",
  "budurl.com",
  "canurl.com",
  "chilp.it",
  "chzb.gr",
  "cl.lk",
  "cl.ly",
  "clck.ru",
  "cli.gs",
  "cliccami.info",
  "clickthru.ca",
  "clop.in",
  "conta.cc",
  "cort.as",
  "cot.ag",
  "crks.me",
  "ctvr.us",
  "cutt.us",
  "dai.ly",
  "decenturl.com",
  "dfl8.me",
  "digbig.com",
  "digg.com",
  "disq.us",
  "dld.bz",
  "dlvr.it",
  "do.my",
  "doiop.com",
  "dopen.us",
  "easyuri.com",
  "easyurl.net",
  "eepurl.com",
  "eweri.com",
  "fa.by",
  "fav.me",
  "fb.me",
  "fbshare.me",
  "ff.im",
  "fff.to",
  "fire.to",
  "firsturl.de",
  "firsturl.net",
  "flic.kr",
  "flq.us",
  "fly2.ws",
  "fon.gs",
  "freak.to",
  "fuseurl.com",
  "fuzzy.to",
  "fwd4.me",
  "fwib.net",
  "g.ro.lt",
  "gizmo.do",
  "gl.am",
  "go.9nl.com",
  "go.ign.com",
  "go.usa.gov",
  "goo.gl",
  "goshrink.com",
  "gurl.es",
  "hex.io",
  "hiderefer.com",
  "hmm.ph",
  "href.in",
  "hsblinks.com",
  "htxt.it",
  "huff.to",
  "hulu.com",
  "hurl.me",
  "hurl.ws",
  "icanhaz.com",
  "idek.net",
  "ilix.in",
  "its.my",
  "ix.lt",
  "j.mp",
  "jijr.com",
  "kl.am",
  "klck.me",
  "korta.nu",
  "krunchd.com",
  "l9k.net",
  "lat.ms",
  "liip.to",
  "liltext.com",
  "linkbee.com",
  "linkbun.ch",
  "liurl.cn",
  "ln-s.net",
  "ln-s.ru",
  "lnk.gd",
  "lnk.ms",
  "lnkd.in",
  "lnkurl.com",
  "lru.jp",
  "lt.tl",
  "lurl.no",
  "macte.ch",
  "mash.to",
  "merky.de",
  "migre.me",
  "miniurl.com",
  "minurl.fr",
  "mke.me",
  "moby.to",
  "moourl.com",
  "mrte.ch",
  "myloc.me",
  "myurl.in",
  "n.pr",
  "nbc.co",
  "nblo.gs",
  "nn.nf",
  "not.my",
  "notlong.com",
  "nsfw.in",
  "nutshellurl.com",
  "nxy.in",
  "nyti.ms",
  "o-x.fr",
  "oc1.us",
  "om.ly",
  "omf.gd",
  "omoikane.net",
  "on.cnn.com",
  "on.mktw.net",
  "onforb.es",
  "orz.se",
  "ow.ly",
  "ping.fm",
  "pli.gs",
  "pnt.me",
  "politi.co",
  "post.ly",
  "pp.gg",
  "profile.to",
  "ptiturl.com",
  "pub.vitrue.com",
  "qlnk.net",
  "qte.me",
  "qu.tc",
  "qy.fi",
  "r.im",
  "rb6.me",
  "read.bi",
  "readthis.ca",
  "reallytinyurl.com",
  "redir.ec",
  "redirects.ca",
  "redirx.com",
  "retwt.me",
  "ri.ms",
  "rickroll.it",
  "riz.gd",
  "rt.nu",
  "ru.ly",
  "rubyurl.com",
  "rurl.org",
  "rww.tw",
  "s4c.in",
  "s7y.us",
  "safe.mn",
  "sameurl.com",
  "sdut.us",
  "shar.es",
  "shink.de",
  "shorl.com",
  "short.ie",
  "short.to",
  "shortlinks.co.uk",
  "shorturl.com",
  "shout.to",
  "show.my",
  "shrinkify.com",
  "shrinkr.com",
  "shrt.fr",
  "shrt.st",
  "shrten.com",
  "shrunkin.com",
  "simurl.com",
  "slate.me",
  "smallr.com",
  "smsh.me",
  "smurl.name",
  "sn.im",
  "snipr.com",
  "snipurl.com",
  "snurl.com",
  "sp2.ro",
  "spedr.com",
  "srnk.net",
  "srs.li",
  "starturl.com",
  "su.pr",
  "surl.co.uk",
  "surl.hu",
  "t.cn",
  "t.co",
  "t.lh.com",
  "ta.gd",
  "tbd.ly",
  "tcrn.ch",
  "tgr.me",
  "tgr.ph",
  "tighturl.com",
  "tiniuri.com",
  "tiny.cc",
  "tiny.ly",
  "tiny.pl",
  "tinylink.in",
  "tinyuri.ca",
  "tinyurl.com",
  "tknk.io",
  "tl.gd",
  "tmi.me",
  "tnij.org",
  "tnw.to",
  "tny.com",
  "to.ly",
  "togoto.us",
  "totc.us",
  "toysr.us",
  "tpm.ly",
  "tr.im",
  "tra.kz",
  "trunc.it",
  "twhub.com",
  "twirl.at",
  "twitclicks.com",
  "twitterurl.net",
  "twitterurl.org",
  "twiturl.de",
  "twurl.cc",
  "twurl.nl",
  "u.mavrev.com",
  "u.nu",
  "u76.org",
  "ub0.cc",
  "ulu.lu",
  "updating.me",
  "ur1.ca",
  "url.az",
  "url.co.uk",
  "url.ie",
  "url360.me",
  "url4.eu",
  "urlborg.com",
  "urlbrief.com",
  "urlcover.com",
  "urlcut.com",
  "urlenco.de",
  "urli.nl",
  "urls.im",
  "urlshorteningservicefortwitter.com",
  "urlx.ie",
  "urlzen.com",
  "usat.ly",
  "use.my",
  "vb.ly",
  "vee.gg",
  "vgn.am",
  "vl.am",
  "vm.lc",
  "w55.de",
  "wapo.st",
  "wapurl.co.uk",
  "wipi.es",
  "wp.me",
  "x.vu",
  "xr.com",
  "xrl.in",
  "xrl.us",
  "xurl.es",
  "xurl.jp",
  "y.ahoo.it",
  "yatuc.com",
  "ye.pe",
  "yep.it",
  "yfrog.com",
  "yhoo.it",
  "yiyd.com",
  "yuarel.com",
  "z0p.de",
  "zi.ma",
  "zi.mu",
  "zipmyurl.com",
  "zud.me",
  "zurl.ws",
  "zws.im",
  "zz.gd",
  "zzang.kr",
  "›.ws",
  "✩.ws",
  "✿.ws",
  "❥.ws",
  "➔.ws",
  "➞.ws",
  "➡.ws",
  "➨.ws",
  "➯.ws",
  "➹.ws",
  "➽.ws",
  "rb.gy",
  "shorturl.at",
];
