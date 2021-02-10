import humanizeDuration = require("humanize-duration");

export type ActionLogType =
  | "system"
  | "public_toggle"
  | "purge"
  | "linkfilter"
  | "message_edit"
  | "message_delete"
  | "invite_role_create"
  | "invite_role_delete"
  | "channel_create"
  | "channel_update"
  | "channel_delete"
  | "invite_create"
  | "invite_delete"
  | "guild_update"
  | "user_unban"
  | "pins_add"
  | "reactrole";
export type ModLogType =
  | "system"
  | "warn"
  | "ban"
  | "unban"
  | "kick"
  | "block"
  | "unblock"
  | "derank"
  | "mute"
  | "unmute"
  | "role_persist"
  | "blacklist"
  | "unblacklist";
export type MemberLogType =
  | "system"
  | "join"
  | "leave"
  | "roles_add"
  | "roles_remove"
  | "nickname_update";

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
    channels: {
      text: "<:channeltext:794243232648921109>",
      voice: "<:channelvoice:794243248444407838>",
      news: "<:channelannouncements:794243262822350919>",
    },
    badlyDrawnBadges: {
      DISCORD_EMPLOYEE: "<:staff:801656423532068904>",
      PARTNERED_SERVER_OWNER: "<:partner:801651976588230656>",
      HYPESQUAD_EVENTS: "<:hypesquad:801652726374596618>",
      BUGHUNTER_LEVEL_1: "<:bug_green:801660995630006273>",
      BUGHUNTER_LEVEL_2: "<:bug_gold:801661691317977138>",
      EARLY_SUPPORTER: "<:early:801660474830618675>",
      VERIFIED_BOT: "<:bot1:801696008912371773><:bot2:801696009138077696>",
      EARLY_VERIFIED_BOT_DEVELOPER: "<:developer:801652881106403329>",
      EARLY_VERIFIED_DEVELOPER: "<:developer:801652881106403329>",
      PARTNERED: "<:partner2:801664798882267157>",
      VERIFIED: "<:verified:801664183800037406>",
    },
    badlyDrawnChannels: {
      text: "<:text:801665348448813086>",
      voice: "<:voice:801665653651275846>",
      news: "<:announcement:801666040324947969>",
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
    discovery: "https://fire.gaminggeek.dev/discover",
    discordStatus: "https://discordstatus.com",
    fireStatus: "https://status.gaminggeek.dev",
    website: "https://fire.gaminggeek.dev/",
    terms: "https://inv.wtf/terms",
    privacy: "https://inv.wtf/privacy",
    // selfhosted instance of https://git.farfrom.earth/aero/imagegen (but with profile removed since I don't need it)
    imageGen: "https://gen.inv.wtf/",
    supportedHaste: ["hastebin.com", "hasteb.in", "hst.sh"],
  },
  imageExts: [".png", ".jpg", ".jpeg", ".gif", ".gifv"],
  regexes: {
    joinleavemsgs: {
      user: /{user}/gim,
      mention: /{user\.mention}/gim,
      name: /{user\.(?:user)?name}/gim,
      discrim: /{user\.discrim(?:inator)?}/gim,
      guild: /{(?:guild|server)}/gim,
      count: /{count}/gim,
    },
    discord: {
      invite: /discord(?:app)?\.(?:com|gg)\/(?:invite\/)?(?<code>[a-zA-Z\d-]{1,25})/im,
      message: /(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(?<guild_id>\d{15,21})\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})/im,
      messageGlobal: /<?(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(?<guild_id>\d{15,21})\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})>?/gim,
      webhook: /discord(?:app)?\.com\/api\/webhooks\/(?<id>\d{15,21})\/(?<token>[\w-]{50,80})/im,
    },
    invites: [
      /(?<domain>(?:dsc|dis|discord|invite)\.(?:gd|gg|io|me))\/(?<code>[a-zA-Z\d-]+)/gim,
      /(?<domain>(?:discord(?:app)?|watchanimeattheoffice)\.com)\/invite\/(?<code>[a-zA-Z\d-]+)/gim,
      /(?<domain>(?:h\.|i\.)?inv\.wtf)\/(?<code>[a-zA-Z\d-]+)/gim,
    ],
    paypal: /(?:paypal\.me|paypal\.com\/paypalme)\/(?<name>[\w-]+)/im,
    youtube: {
      channel: /youtube\.com\/(?:c\/|channel\/|user\/)?(?<channel>[^"\s]+)/im,
      video: /(youtu\.be\/|invidio\.us\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)(?<video>[\w-]+)/im,
    },
    twitch: {
      clip: /clips\.twitch\.tv\/(?<clip>\w+)/im,
      channel: /twitch\.tv\/(?<channel>.+)/im,
    },
    twitter: /twitter\.com\/(?<username>\w+)(?:\/status\/(?<tweet>\d+)?|\/(?<path>likes|media|with_replies|followers|following|suggested))?/im,
    imageURL: /((?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*(?:\.png|\.jpg|\.jpeg|\.gif|\.gifv|\.webp)))/im,
    time: {
      phrasing: [
        /(?:me to (?<reminder>.+) in | ?me in | ?in )?(?:(?<months>\d+)(?: ?months?| ?mos?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )?(?:(?<weeks>\d+)(?: ?w(?:ee)?k?s?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )?(?:(?<days>\d+)(?: ?d(?:ay)?s?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )?(?:(?<hours>\d+)(?: ?h(?:(?:ou)?rs?)?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )?(?:(?<minutes>\d+)(?: ?m(?:in)?(?:utes?)?))(?: ?about | ?that | ?to )?/im,
        /(?:me to (?<reminder>.+) in | ?me in | ?in )?(?:(?<seconds>\d+)(?: ?s(?:ec)?(?:onds?)?))(?: ?about | ?that | ?to )?/im,
      ],
      month: /(?<months>\d+)(?: ?months?| ?mos?)/im,
      week: /(?<weeks>\d+)(?: ?w(?:ee)?k?s?)/im,
      day: /(?<days>\d+)(?: ?d(?:ay)?s?)/im,
      hours: /(?<hours>\d+)(?: ?h(?:(?:ou)?rs?)?)/im,
      minutes: /(?<minutes>\d+)(?: ?m(?:in)?(?:utes?)?)/im,
      seconds: /(?<seconds>\d+)(?: ?s(?:ec)?(?:onds?)?)/im,
    },
    haste: /(?<uploader>hastebin\.com|hasteb\.in|hst\.sh|h\.inv\.wtf)\/(?<key>\w{1,20})/gim,
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
  mcLogFilters: [
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
    "me.powns.lavafix.asm.ItemBucketTransformer$1:visitMethod:22",
    "[SkyblockAddons - #0/INFO]: [SkyblockAddons/SkyblockAddons/",
    "Using missing texture, unable to load minecraft:mcpatcher/",
    "Offendor: com/sun/jna/Native.main([Ljava/lang/String;)V",
    "com.connorlinfoot.discordrp.LinfootUpdater:doCheck:44",
    "[net.modcore.loader.ModCoreLoader:isInClassPath:",
    "[Client thread/INFO]: Found 1 transformers for ",
    "[OptiFine] (Reflector) Class not present:",
    "Use FMLCommonHandler.exitJava instead",
    "has a security seal for path org.lwjgl",
    "Needed to grow BufferBuilder buffer: ",
    "[optifine.OptiFineForgeTweaker:dbg",
    "ModCoreInstaller:isInitalized:61]:",
    "[OptiFine] Scaled non power of 2:",
    "Applying AsmWriter InjectWriter",
    "[main/INFO]: Mixing Mixin",
    "[OptiFine] BetterGrass:",
    "Colormap mcpatcher/",
    "[OptiFine] *** Re",
    "[OptiFine] Mipmap",
    "[OptiFine] Multi",
    "[main/DEBUG]:",
    "[main/TRACE]:",
    ": mcpatcher/",
    `ERROR]: The mcmod.info file in [1.8.9] Powns ToggleSneak - 3.0.jar cannot be parsed as valid JSON. It will be ignored
com.google.gson.JsonSyntaxException: com.google.gson.stream.MalformedJsonException: Unterminated array at line 11 column 5`,
    `FATAL]: Error executing task
java.util.concurrent.ExecutionException: java.lang.ArrayIndexOutOfBoundsException
	at java.util.concurrent.FutureTask.report(FutureTask.java:122) ~[?:1.8.0_51]
	at java.util.concurrent.FutureTask.get(FutureTask.java:192) ~[?:1.8.0_51]
	at net.minecraft.util.Util.func_181617_a(Util.java:20) [g.class:?]
	at net.minecraft.client.Minecraft.func_71411_J(Minecraft.java:1014) [ave.class:?]
	at net.minecraft.client.Minecraft.func_99999_d(Minecraft.java:349) [ave.class:?]
	at net.minecraft.client.main.Main.main(SourceFile:124) [Main.class:?]`,
    `FATAL]: Error executing task
java.util.concurrent.ExecutionException: java.lang.NullPointerException
	at java.util.concurrent.FutureTask.report(FutureTask.java:122) ~[?:1.8.0_51]
	at java.util.concurrent.FutureTask.get(FutureTask.java:192) ~[?:1.8.0_51]
	at net.minecraft.util.Util.func_181617_a(Util.java:20) [g.class:?]
	at net.minecraft.client.Minecraft.func_71411_J(Minecraft.java:1014) [ave.class:?]
	at net.minecraft.client.Minecraft.func_99999_d(Minecraft.java:349) [ave.class:?]
	at net.minecraft.client.main.Main.main(SourceFile:124) [Main.class:?]`,
    `Caused by: java.lang.NullPointerException
	at net.minecraft.scoreboard.Scoreboard.func_96511_d(SourceFile:229) ~[auo.class:?]`,
    `Caused by: java.lang.NullPointerException
	at net.minecraft.scoreboard.Scoreboard.func_96519_k(SourceFile:179) ~[auo.class:?]`,
  ],
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
  if (replace) {
    for (const phrase of regexes.phrasing) {
      const match = phrase.exec(content);
      phrase.lastIndex = 0;
      content = content.replace(phrase, match?.groups?.reminder || "");
    }
    return content.replace(/\s{2,}/gim, " ").trimStart();
  }
  content = content.trim();
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
