import { Chrono, Component as DateComponent } from "chrono-node";
import * as dayjs from "dayjs";
import {
  BaseMessageComponentOptions,
  MessageActionRow,
  MessageActionRowOptions,
  MessageEmbed,
  MessageEmbedOptions,
  MessageMentionOptions,
  NewsChannel,
  ReplyOptions,
  VoiceChannel,
} from "discord.js";
import { StringMap, TOptions } from "i18next";
import { FireGuild } from "../extensions/guild";
import { FireTextChannel } from "../extensions/textchannel";
import { Language } from "./language";

const emojiRegex = require("emoji-regex")() as RegExp;
const emojiRegexStr = emojiRegex.toString();

export type GuildOrUserConfig = Record<string, SettingsValueTypes>;
type SettingsValueTypesBase = string | number | boolean | null;
export type SettingsValueTypes =
  | SettingsValueTypesBase
  | SettingsValueTypesBase[];

export enum CouponType {
  MEMBER = "MEMBER",
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
  ROLE_CREATE = 1 << 15,
  ROLE_DELETE = 1 << 16,
  ROLE_UPDATE = 1 << 17,
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

export type GuildTextChannel = FireTextChannel | VoiceChannel | NewsChannel;

export type i18nOptions = TOptions<StringMap> & {
  components?: (
    | MessageActionRow
    | (Required<BaseMessageComponentOptions> & MessageActionRowOptions)
  )[];
  embeds?: (MessageEmbed | MessageEmbedOptions)[];
  allowedMentions?: MessageMentionOptions;
  reply?: ReplyOptions;
  includeSlashUpsell?: boolean;
};

export type CommonContext = { guild?: FireGuild; language: Language };

// errors thrown by the base command class exec & run methods telling you to use the other method
export class UseExec extends Error {}
export class UseRun extends Error {}

const websiteDomain = `${
  process.env.NODE_ENV == "development" ? "local." : ""
}getfire.bot`;

export const constants = {
  badges: [
    "DISCORD_EMPLOYEE",
    "PARTNERED_SERVER_OWNER",
    "HYPESQUAD_EVENTS",
    "BUGHUNTER_LEVEL_1",
    "BUGHUNTER_LEVEL_2",
    "EARLY_SUPPORTER",
    "EARLY_VERIFIED_BOT_DEVELOPER",
    "DISCORD_CERTIFIED_MODERATOR",
    "ACTIVE_DEVELOPER",
  ],
  // urls
  url: {
    discovery: "https://getfire.bot/discover",
    discordStatus: "https://discordstatus.com",
    fireStatus: "https://firestatus.link",
    website: `https://${websiteDomain}`,
    websiteDomain,
    terms: "https://inv.wtf/terms",
    privacy: "https://inv.wtf/privacy",
    premium: "https://inv.wtf/premium",
    support: "https://inv.wtf/fire",
    // selfhosted instance of https://git.farfrom.earth/aero/imagegen (but with profile removed since I don't need it)
    imageGen: "https://gen.inv.wtf/",
    supportedHaste: ["hastebin.com (incl. Toptal link)", "hasteb.in", "hst.sh"],
    automodAvatar: "https://static.inv.wtf/discord_automod.png",
  },
  imageExts: [".png", ".webp", ".jpg", ".jpeg", ".gif", ".gifv"],
  audioExts: [".mp3", ".wav", ".flac", ".alac", ".m4a"],
  videoExts: [".mp4", ".mkv", ".mov", ".webm"],
  prodBotId: "444871677176709141",
  regexes: {
    maskedLink: /\[(?<name>[^\]]+)\]\((?<link><?https?:\/\/[^\)]+>?)\)/gim,
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
    basicURL: /((?:<)?https?:\/\/[^\s\n]+(?:>)?)/gi,
    protocol: /\w{1,10}:\/\//gim,
    blockedUsername: /Username cannot contain "(\w*)"/gim,
    joinleavemsgs: {
      user: /{user}/gim,
      mention: /{user\.mention}/gim,
      name: /{user\.(?:user)?name}/gim,
      displayName: /{user\.displayname}/gim,
      discrim: /{user\.discrim(?:inator)?}/gim,
      guild: /{(?:guild|server)}/gim,
      count: /{count}/gim,
      countSuffix: /{count\.suffix}/gim,
    },
    invwtf: /inv\.wtf\/(?<code>[\w-]{2,25})/gim,
    discord: {
      snowflake: /\d{15,21}/g,
      userMention: /<@!?(\d{15,21})>/gim,
      roleMention: /<@&(\d{15,21})>/gim,
      channelMention: /<#(\d{15,21})>/gim,
      invite:
        /discord(?:app)?\.(?:com|gg)\/(?:invite\/)?(?<code>[\w-]{1,25})/gim,
      invitePartial: /invites?\/(?:[\w-]{1,25})/gim,
      cdnEmoji:
        /^https?:\/\/cdn\.discordapp\.com\/emojis\/(\d{15,21})\.\w{3,4}(?:\?v=\d|\?size=\d{1,4})?/gim,
      cdnAttachment:
        /^https?:\/\/cdn\.discordapp\.com\/attachments\/\d{15,21}\/\d{15,21}\/\w*\.\w{3,4}\?ex=(?<ex>[0-9a-fA-F]{8,12})&is=(?<is>\d{8,12})&hm=(?<hm>[0-9a-f]{64})&?/im,
      message:
        /(?:ptb\.|canary\.|staging\.|lc\.|dscrd\.)?(?:discord(?:app)?|inv)\.(?:com?|wtf)?\/channels\/(?<guild_id>\d{15,21}|@me)\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})/im,
      quoteMessage:
        /<?(?<channel>debug\.|dev\.|beta\.|ptb\.|canary\.|staging\.|lc\.|dscrd\.)?(?:discord(?:app)?|inv)\.(?:com?|wtf)?\/channels\/(?<guild_id>\d{15,21}|@me)\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})(?:-?https?:\/\/(?:debug\.|dev\.|beta\.|ptb\.|canary\.|staging\.|lc\.|dscrd\.)?(?:discord(?:app)?|inv)\.(?:com?|wtf)?\/channels\/(?<end_guild_id>\d{15,21}|@me)\/(?<end_channel_id>\d{15,21})\/(?<end_message_id>\d{15,21}))?/gim,
      webhook:
        /discord(?:app)?\.com\/api\/(?:v\d{1,2}\/)?webhooks\/(?<id>\d{15,21})\/(?<token>[\w-]{50,80})(?<thread>\?thread_id=(?<threadId>\d{15,21}))?/im,
      webhookPartial: /(webhooks|interactions)\/:id\/(?<token>[\w-]{0,250})/im,
      webhookPartialWithId: /\/webhooks\/\d{15,21}\/[\w-]{50,80}/im,
    },
    invites: [
      /(?<domain>(?:dsc|dis|discord|invite)\.(?:gd|gg|io|me))\/(?<code>[\w-]+)/gim,
      /(?<domain>(?:discord(?:app)?|watchanimeattheoffice)\.com)\/(?:invites?|friend-invites?)\/(?<code>[\w-]+)/gim,
      /(?<domain>(?:h\.|i\.)?inv\.wtf)\/(?<code>[\w-]+)/gim,
    ],
    paypal: /(?:paypal\.me|paypal\.com\/paypalme)\/(?<name>[\w-]+)/im,
    youtube: {
      channel:
        /(?:you\s?tube|u\s?tube)\.com\/(?:c\/|channel\/|user\/)?(?<channel>[^"\s]+)/gim,
      video:
        /(?:https:\/\/|http:\/\/)?(?:www\.)?(youtu\.be\/|invidio\.us\/|(?:you\s?tube|u\s?tube)\.com\/watch\?v=|(?:you\s?tube|u\s?tube)\.com\/embed\/|(?:you\s?tube|u\s?tube)\.com\/shorts\/|(?:you\s?tube|u\s?tube)\.com\/clip\/)(?<video>[\w-]+)/gim,
    },
    twitch: {
      clip: /clips\.twitch\.tv\/(?<clip>\w+)/im,
      channel: /twitch\.tv\/(?<channel>.+)/im,
    },
    twitter:
      /(?:twitter|twittpr|x)\.com\/(?<username>\w+)(?:\/status\/(?<tweet>\d+)?|\/(?<path>likes|media|with_replies|followers|following|suggested))?/im,
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
      month: /(?<months>\d+)(?: ?months?| ?mos?)/im,
      week: /(?<weeks>\d+)(?: ?w(?:ee)?k?s?)/im,
      day: /(?<days>\d+)(?: ?d(?:ay)?s?)/im,
      hours: /(?<hours>\d+)(?: ?h(?:(?:ou)?rs?)?)/im,
      minutes: /(?<minutes>\d+)(?: ?m(?:ins?)?(?:utes?)?)/im,
      seconds: /(?<seconds>\d+)(?: ?s(?:ec)?(?:onds?)?)/im,
    },
    haste:
      /(?<uploader>(?:www\.)?toptal\.com\/developers\/hastebin|hastebin\.com|hasteb\.in|hst\.sh|h\.inv\.wtf)\/(?<key>\w{1,20})/gim,
  },
  escapedShruggie: "¯\\_(ツ)_/¯",
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
  instatus: {
    colors: {
      UP: null,
      HASISSUES: "#e67e22",
      UNDERMAINTENANCE: "#3498db",
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

const dayJSToDateComponents = (dayjs: dayjs.Dayjs) => ({
  year: dayjs.year(),
  month: dayjs.month() + 1,
  day: dayjs.date(),
  hour: dayjs.hour(),
  minute: dayjs.minute(),
  second: dayjs.second(),
  millisecond: dayjs.millisecond(),
});
type KnownValues = {
  [c in DateComponent]?: number;
};
const dateComponentToManipulateType: {
  [c in DateComponent]?: dayjs.ManipulateType;
} = {
  year: "years",
  month: "months",
  weekday: "weeks",
  day: "day",
  hour: "hours",
  minute: "minute",
  second: "seconds",
};
// Chrono instance for classic remind style parsing
export const classicRemind = new Chrono({
  // Parsers should return just their parsed values rather than a date
  // then the refiner will merge them all
  parsers: [
    {
      pattern: () => constants.regexes.time.month,
      extract: (_, match) => {
        if (!match || !match[0]) return null;
        const months = parseInt(match.groups?.months) || 0;
        return {
          month: months,
        };
      },
    },
    {
      pattern: () => constants.regexes.time.week,
      extract: (_, match) => {
        if (!match || !match[0]) return null;
        const weeks = parseInt(match.groups?.weeks) || 0;
        return {
          weekday: weeks,
        };
      },
    },
    {
      pattern: () => constants.regexes.time.day,
      extract: (_, match) => {
        if (!match || !match[0]) return null;
        const days = parseInt(match.groups?.days) || 0;
        return {
          day: days,
        };
      },
    },
    {
      pattern: () => constants.regexes.time.hours,
      extract: (_, match) => {
        if (!match || !match[0]) return null;
        const hours = parseInt(match.groups?.hours) || 0;
        return {
          hour: hours,
        };
      },
    },
    {
      pattern: () => constants.regexes.time.minutes,
      extract: (_, match) => {
        if (!match || !match[0]) return null;
        const minutes = parseInt(match.groups?.minutes) || 0;
        return {
          minute: minutes,
        };
      },
    },
    {
      pattern: () => constants.regexes.time.seconds,
      extract: (_, match) => {
        if (!match || !match[0]) return null;
        const seconds = parseInt(match.groups?.seconds) || 0;
        return {
          second: seconds,
        };
      },
    },
  ],
  refiners: [
    {
      refine: (context, results) => {
        const text = [];
        let date = dayjs(context.refDate);
        results = results.filter((result, index) => {
          const matchingIndex = results.find(
            (r, i) => r.index == result.index && i != index
          );
          if (!matchingIndex) return true;
          // @ts-ignore
          const matchingKnown = matchingIndex.start.knownValues as KnownValues;
          // @ts-ignore
          const currentKnown = result.start.knownValues as KnownValues;
          if (matchingKnown.month == currentKnown.minute && !currentKnown.month)
            return false; // likely a false match for the "m" in month
          return true;
        });
        for (const result of results) {
          // @ts-ignore
          const known = result.start.knownValues as KnownValues;
          for (const [type, value] of Object.entries(known)) {
            // we should never get these, ignore if we do somehow
            if (type == "meridiem" || type == "timezoneOffset") continue;
            if (value) {
              if (!text.includes(result.text)) text.push(result.text);
              date = date.add(value, dateComponentToManipulateType[type]);
            }
          }
        }
        return [
          context.createParsingResult(
            0,
            text.join(","),
            context.createParsingComponents(dayJSToDateComponents(date))
          ),
        ];
      },
    },
  ],
});

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
