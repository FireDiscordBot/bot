import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { IPoint } from "@fire/lib/interfaces/aether";
import { FabricLoaderVersion } from "@fire/lib/interfaces/fabricmc";
import { Release } from "@fire/lib/interfaces/github";
import { ForgePromotions } from "@fire/lib/interfaces/minecraftforge";
import { Sk1erMods } from "@fire/lib/interfaces/sk1ermod";
import { constants, titleCase } from "@fire/lib/util/constants";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { Readable } from "stream";
import { getCodeblockMatch } from "../arguments/codeblock";
import Filters from "./filters";

const { mcLogFilters } = constants;

const allowedURLs = [
  "minecraftservices.com",
  "microsoftonline.com",
  "minecraftforge.net",
  "logging.apache.org",
  "microsoft.com",
  "xboxlive.com",
  "fabricmc.net",
  "essential.gg",
  "mojang.com",
  "sk1er.club",
  "lwjgl.org",
  "127.0.0.1",
  "live.com",
];

enum Loaders {
  FORGE = "Forge",
  FABRIC = "Fabric",
  OPTIFINE = "Vanilla w/OptiFine HD U", // will be shown as "Vanilla w/OptiFine HD U H4"
  FEATHER = "Feather",
}

type ModSource = `${string}.jar`;
type MinecraftVersion = `${number}.${number}.${number}` | `${number}.${number}`;
type Haste = { url: string; raw: string };
type LoaderRegexConfig = {
  loader: Loaders;
  regexes: RegExp[];
};
type VersionInfo = {
  loader: Loaders;
  mcVersion: MinecraftVersion;
  loaderVersion: string;
  optifineVersion: string;
  javaVersion: string;
  jvmType: string;
  mods: ModInfo[];
};
type ModInfo = {
  state: string;
  modId: string;
  version: string;
  source: ModSource;
};

export default class MCLogs extends Module {
  statsTask: NodeJS.Timeout;
  regexes: {
    reupload: RegExp;
    noRaw: RegExp;
    secrets: RegExp;
    jvm: RegExp;
    optifine: RegExp;
    exOptifine: RegExp;
    ram: RegExp;
    email: RegExp;
    url: RegExp;
    home: RegExp;
    settingUser: RegExp;
    devEnvUser: RegExp;
    loaderVersions: LoaderRegexConfig[];
    modsTableHeader: RegExp;
    modsTableEntry: RegExp;
    classicForgeModsEntry: RegExp;
    fullLogJavaVersion: RegExp;
    crashReportJavaVersion: RegExp;
    date: RegExp;
    semver: RegExp;
    majorMinorOnly: RegExp;
  };
  logText: string[];
  solutions: {
    solutions: { [key: string]: string };
    recommendations: { [key: string]: string };
    cheats: string[];
  };
  modVersions: Record<string, Record<MinecraftVersion, string>>; // map of modid to map of mc version to latest mod version

  constructor() {
    super("mclogs");
    this.modVersions = {};
    this.solutions = { solutions: {}, recommendations: {}, cheats: [] };
    this.regexes = {
      reupload:
        /(?:https?:\/\/)?(paste\.ee|pastebin\.com|has?tebin\.com|toptal\.com\/developers\/hastebin|hasteb\.in|hst\.sh)\/(?:raw\/|p\/)?([\w-\.]+)/gim,
      noRaw: /(justpaste\.it)\/(\w+)/gim,
      secrets:
        /("access_key":".+"|api.sk1er.club\/auth|LoginPacket|SentryAPI.cpp|"authHash":|"hash":"|--accessToken \S+|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :|USERNAME=.*|https:\/\/api\.hypixel\.net\/.+(\?key=|&key=))/gim,
      jvm: /JVM Flags: (8|7) total;(?: -XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump)? -Xmx\d{1,2}(?:G|M) -XX:\+UnlockExperimentalVMOptions -XX:\+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M/gim,
      optifine:
        /OptiFine_(?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)_HD_U_(?<ofver>[A-Z]\d(?:_pre\d{1,2})?)/im,
      exOptifine: /HD_U_\w\d_MOD/gm,
      ram: /-Xmx(?<ram>\d{1,2})(?<type>G|M)/gim,
      email: /[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z-.]{1,10}/gim,
      url: /(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/gim,
      home: /(\/Users\/[\w\s]+|\/home\/\w+|C:\\Users\\[\w\s]+)/gim,
      settingUser:
        /(?:\/INFO]: Setting user: (\w{1,16})|--username, (\w{1,16}))/gim,
      devEnvUser: /Player\d{3}/gim,
      modsTableHeader:
        /\|\sState\s*\|\sID\s*\|\sVersion\s*\|\sSource\s*\|(?:\sSignature\s*\|)?/gim,
      modsTableEntry:
        /^\s*\|\s*(?<state>[ULCHIJADE]*)\s*\|\s*(?<modid>[a-z][a-z0-9_\.'|\-]{1,63})\s*\|\s*(?<version>[\w.-]*)\s*\|\s*(?<source>.*\.jar)\s*\|/gim,
      classicForgeModsEntry:
        /^\s*(?<state>[ULCHIJADE]*)\s*(?<modid>[a-z][a-z0-9_.-]{1,63}){(?<version>[\w.-]*)}\s*\[(?<display>[\w\s]*)\]\s*\((?<source>.*\.jar)\)/gim,
      fullLogJavaVersion:
        /Java is (?<name>.* VM), version (?<version>\d*\.\d*\.\d*_\d{1,3}). running on (?<os>(?<osname>[\w\s]*):(?<osarch>\w*):(?<osversion>.*)), installed at (?<path>.*)$/gim,
      crashReportJavaVersion:
        /Java Version: (?<version>\d*\.\d*\.\d*_\d{1,3}).*\n\s*Java VM Version: (?<name>.* VM)/gim,
      loaderVersions: [
        // this needs to be at the top as otherwise it'd trip another regex first
        // since feather is just a mod, not a loader
        {
          loader: Loaders.FEATHER,
          regexes: [
            /Started Feather \((?<loaderver>\w*)\)/gim,

            // Feather isn't nice and doesn't log the mc version so we need to try the Forge/Fabric regexes too
            /Forge Mod Loader version (?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5} for Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?) loading/gim,
            /Forge mod loading, version (?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}, for MC (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)/gim,
            /--version, (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-forge-(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}/gim,
            /Launched Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-forge(?:\d\.\d{1,2}(?:\.\d{1,2})?)-(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}/gim,
            /forge-(?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}/gim,
            /Loading Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?) with Fabric Loader \d\.\d{1,3}\.\d{1,3}/gim,
            /Loading for game Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)/gim,
          ],
        },
        {
          loader: Loaders.FABRIC,
          regexes: [
            /Loading Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?) with Fabric Loader (?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
          ],
        },
        {
          loader: Loaders.FABRIC,
          regexes: [
            /Loading for game Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)/gim,
            /fabricloader(?:@|\s*)(?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Forge Mod Loader version (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}) for Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?) loading/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Forge mod loading, version (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}), for MC (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /--version, (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-forge-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /forge-(?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Launched Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-forge(?:\d\.\d{1,2}(?:\.\d{1,2})?)-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
          ],
        },
        {
          loader: Loaders.OPTIFINE,
          regexes: [
            /Launched Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?)-OptiFine_HD_U_(?<loaderver>[A-Z]\d)/gim,
          ],
        },
      ],
      date: /^time: (?<date>[\w \/\.:-]+)$/gim,
      semver:
        /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/gim,
      majorMinorOnly: /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)$/gim,
    };
    this.logText = [
      "net.minecraft.launchwrapper.Launch",
      "# A fatal error has been detected by the Java Runtime Environment:",
      "---- Minecraft Crash Report ----",
      "A detailed walkthrough of the error",
      "launchermeta.mojang.com",
      "Running launcher core",
      "Native Launcher Version:",
      "[Client thread/INFO]: Setting user:",
      "[Client thread/INFO]: (Session ID is",
      "MojangTricksIntelDriversForPerformance",
      "Loading for game Minecraft ",
      "[main/INFO]: [FabricLoader] Loading ",
      ".minecraft/libraries/net/fabricmc",
      "net.fabricmc.loader.launch",
      "net.fabricmc.loader.game",
      "net.minecraftforge",
      "gg.essential",
      "club.sk1er",
      "fabric-api",
      "Environment: authHost='https://authserver.mojang.com'",
      " with Fabric Loader ",
    ];
  }

  private canUse(guild?: FireGuild, user?: FireUser) {
    if (guild)
      return (
        guild.hasExperiment(77266757, [1, 2]) ||
        (guild.premium && guild.settings.get("minecraft.logscan", false))
      );
    else if (user) return user.isSuperuser();
  }

  async init() {
    await this.client.waitUntilReady();
    if (
      !this.client.guilds.cache.some((guild: FireGuild) =>
        this.canUse(guild)
      ) &&
      this.client.manager.id != 0 // cluster 0 will always have shard 0 which is what we want (to allow superusers to DM logs)
    )
      return this.remove();
    this.solutions = { solutions: {}, recommendations: {}, cheats: [] };
    const solutionsReq = await centra(
      `https://api.github.com/repos/GamingGeek/BlockGameSolutions/contents/mc_solutions.json`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", `token ${process.env.GITHUB_SOLUTIONS_TOKEN}`)
      .send();
    if (solutionsReq.statusCode == 200) {
      const solutions = await solutionsReq.json().catch(() => {});
      if (solutions?.content)
        this.solutions = JSON.parse(
          Buffer.from(solutions.content, "base64").toString("ascii")
        );
    }
    this.fetchSk1erModVersions().catch(() => {});
    this.fetchLatestSkytilsVersion().catch(() => {});
  }

  async fetchSk1erModVersions() {
    const modsReq = await centra("https://api.sk1er.club/mods")
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (modsReq.statusCode != 200) return;
    const mods = (await modsReq.json().catch(() => {})) as Sk1erMods;
    if (!mods) return;
    for (const [modid, data] of Object.entries(mods)) {
      this.modVersions[modid.toLowerCase()] = data.latest;
    }
  }

  async fetchLatestSkytilsVersion() {
    const releasesReq = await centra(
      "https://api.github.com/repos/Skytils/SkytilsMod/releases"
    )
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (releasesReq.statusCode != 200) return;
    let releases = (await releasesReq.json().catch(() => {})) as Release[];
    if (!releases) return;
    releases = releases.sort(
      (a, b) => +new Date(b.published_at) - +new Date(a.published_at)
    );
    const latest = releases[0];
    this.modVersions["skytils"] = { "1.8.9": latest.tag_name.slice(1) };
  }

  private async getSolutionsAnalytics(
    user: FireMember | FireUser,
    haste: Haste,
    solutions: Set<string>,
    recommendations: Set<string>
  ) {
    // user has not opted out of data collection for analytics
    if (!user.hasExperiment(2219986954, 1)) {
      let solutionsHaste: Haste, recommendationsHaste: Haste;
      if (solutions.size)
        solutionsHaste = await this.client.util
          .haste(JSON.stringify(solutions), true, "json", true)
          .catch(() => undefined);
      if (recommendations.size)
        recommendationsHaste = await this.client.util
          .haste(JSON.stringify(recommendations), true, "json", true)
          .catch(() => undefined);
      if (solutionsHaste || recommendationsHaste) {
        const point: IPoint = {
          measurement: "mclogs",
          tags: {
            type: "bgs",
            user_id: user.id,
            cluster: this.client.manager.id.toString(),
            shard:
              user instanceof FireMember
                ? user.guild?.shardId.toString() ?? "0"
                : "Unknown",
          },
          fields: {
            guild:
              user instanceof FireMember
                ? `${user.guild?.name} (${user.guild?.id})`
                : "Unknown",
            user: `${user} (${user.id})`,
            haste: haste.url,
            raw: haste.raw,
          },
        };
        if (solutionsHaste) point.fields.solutions = solutionsHaste.url;
        if (recommendationsHaste)
          point.fields.recommendations = recommendationsHaste.url;
        this.client.influx([point]);
      }
    }
  }

  private getMCInfo(log: string): VersionInfo {
    let loader: Loaders,
      mcVersion: MinecraftVersion,
      loaderVersion: string,
      optifineVersion: string,
      mods: ModInfo[] = [],
      javaVersion: string,
      javaVendor: string;

    for (const config of this.regexes.loaderVersions) {
      const matches = config.regexes.map((regex) => regex.exec(log));
      config.regexes.forEach((regex) => (regex.lastIndex = 0));
      let matchedMcVer: MinecraftVersion, matchedLoaderVer: string;
      for (const match of matches) {
        if (match?.groups?.mcver)
          mcVersion = matchedMcVer = match.groups.mcver as MinecraftVersion;
        if (match?.groups?.loaderver)
          loaderVersion = matchedLoaderVer = match.groups.loaderver;
        if (matchedMcVer || matchedLoaderVer) loader = config.loader;
      }
      if (loader && mcVersion && loaderVersion) break;
    }

    let optifineMatch: RegExpExecArray;
    while ((optifineMatch = this.regexes.optifine.exec(log))) {
      if (optifineMatch?.groups?.ofver && optifineMatch?.groups?.mcver) break;
      else optifineMatch = null;
    }
    this.regexes.optifine.lastIndex = 0;
    if (optifineMatch && optifineMatch?.groups?.mcver == mcVersion)
      optifineVersion = optifineMatch.groups.ofver;

    if (this.regexes.modsTableHeader.test(log)) {
      let modMatch: RegExpExecArray;
      while ((modMatch = this.regexes.modsTableEntry.exec(log)))
        if (!mods.find((i) => i.modId == modMatch.groups.modid))
          mods.push({
            state: modMatch.groups.state,
            modId: modMatch.groups.modid,
            version: modMatch.groups.version,
            source: modMatch.groups.source as ModSource,
          });
      this.regexes.modsTableHeader.lastIndex = 0;
      this.regexes.modsTableEntry.lastIndex = 0;
    } else if (loader == Loaders.FORGE) {
      let modMatch: RegExpExecArray;
      while ((modMatch = this.regexes.classicForgeModsEntry.exec(log)))
        if (!mods.find((i) => i.modId == modMatch.groups.modid))
          mods.push({
            state: modMatch.groups.state,
            modId: modMatch.groups.modid,
            version: modMatch.groups.version,
            source: modMatch.groups.source as ModSource,
          });
      this.regexes.classicForgeModsEntry.lastIndex = 0;
    }

    if (this.regexes.fullLogJavaVersion.test(log)) {
      const javaMatch = this.regexes.fullLogJavaVersion.exec(log);
      javaVersion = javaMatch?.groups?.version;
      javaVendor = javaMatch?.groups?.name;
    } else {
      const javaMatch = this.regexes.crashReportJavaVersion.exec(log);
      javaVersion = javaMatch?.groups?.version;
      javaVendor = javaMatch?.groups?.name;
    }
    this.regexes.fullLogJavaVersion.lastIndex = 0;
    this.regexes.crashReportJavaVersion.lastIndex = 0;

    return {
      loader,
      mcVersion,
      loaderVersion,
      optifineVersion,
      javaVersion,
      jvmType: javaVendor,
      mods,
    };
  }

  private async getSolutions(
    user: FireMember | FireUser,
    versions: VersionInfo,
    haste: Haste,
    log: string
  ) {
    const language =
      user instanceof FireMember
        ? user.guild.language
        : this.client.getLanguage("en-US");

    if (
      versions.loader == Loaders.FEATHER ||
      versions.mods.find((m) => m.modId == "feather")
    ) {
      // user has not opted out of data collection for analytics
      if (!user.hasExperiment(2219986954, 1))
        // i need better ways of detecting feather
        // so I need more log samples
        this.client.influx([
          {
            measurement: "mclogs",
            tags: {
              type: "feather",
              user_id: user.id,
              cluster: this.client.manager.id.toString(),
              shard:
                user instanceof FireMember
                  ? user.guild?.shardId.toString() ?? "0"
                  : "Unknown",
            },
            fields: {
              guild:
                user instanceof FireMember
                  ? `${user.guild?.name} (${user.guild?.id})`
                  : "Unknown",
              user: `${user} (${user.id})`,
              haste: haste.url,
              raw: haste.raw,
            },
          },
        ]);
      return `Feather "Client" is not supported. Any issues that occur while using it must be reported to Feather's support team.`;
    }

    if (
      this.solutions.cheats.some((cheat) =>
        log.toLowerCase().includes(cheat.toLowerCase())
      )
    ) {
      const found = this.solutions.cheats.filter((cheat) =>
        log.toLowerCase().includes(cheat.toLowerCase())
      );
      // user has not opted out of data collection for analytics
      if (!user.hasExperiment(2219986954, 1))
        this.client.influx([
          {
            measurement: "mclogs",
            tags: {
              type: "cheats",
              user_id: user.id,
              cluster: this.client.manager.id.toString(),
              shard:
                user instanceof FireMember
                  ? user.guild?.shardId.toString() ?? "0"
                  : "Unknown",
            },
            fields: {
              guild:
                user instanceof FireMember
                  ? `${user.guild?.name} (${user.guild?.id})`
                  : "Unknown",
              user: `${user} (${user.id})`,
              found: found.join(", "),
              haste: haste.url,
              raw: haste.raw,
            },
          },
        ]);
      return `Cheat${found.length > 1 ? "s" : ""} found (${found.join(
        ", "
      )}). Bailing out, you are on your own now. Good luck.`;
    }

    let currentSolutions = new Set<string>();
    let currentRecommendations = new Set<string>();

    for (const [err, sol] of Object.entries(this.solutions.solutions)) {
      if (log.toLowerCase().includes(err.toLowerCase()))
        currentSolutions.add(`- **${sol}**`);
    }

    if (versions?.loader == Loaders.FABRIC) {
      if (versions?.optifineVersion)
        currentSolutions.add(
          `- **Fabric 1.17/1.18 is not supported by OptiFine. It is recommended to use the (way better) alternatives from this list \n<https://lambdaurora.dev/optifine_alternatives>**`
        );
      const loaderDataReq = await centra(
        `https://meta.fabricmc.net/v1/versions/loader/${versions.mcVersion}`
      )
        .header("User-Agent", this.client.manager.ua)
        .send();
      const loaderData: FabricLoaderVersion[] = await loaderDataReq
        .json()
        .catch(() => []);
      if (
        loaderData.length &&
        loaderData[0].loader.version != versions.loaderVersion
      )
        currentSolutions.add(
          "- **" +
            language.get("MC_LOG_UPDATE", {
              item: Loaders.FABRIC,
              current: versions.loaderVersion,
              latest: loaderData[0].loader.version,
            }) +
            "**"
        );
    } else if (versions?.loader == Loaders.FORGE) {
      const dataReq = await centra(
        "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json"
      )
        .header("User-Agent", this.client.manager.ua)
        .send();
      const data: ForgePromotions = await dataReq.json().catch(() => ({
        homepage: "",
        promos: {},
      }));
      if (`${versions.mcVersion}-latest` in data.promos) {
        const latestForge = data.promos[`${versions.mcVersion}-latest`];
        if (latestForge != versions.loaderVersion)
          currentSolutions.add(
            "- **" +
              language.get("MC_LOG_UPDATE", {
                item: Loaders.FORGE,
                current: versions.loaderVersion,
                latest: latestForge,
              }) +
              "**"
          );
      }

      if (
        versions.optifineVersion &&
        !versions.optifineVersion.includes("_pre")
      ) {
        const dataReq = await centra(
          `https://optifine.net/version/${versions.mcVersion}/HD_U.txt`
        )
          .header("User-Agent", this.client.manager.ua)
          .send();
        const latestOptifine = dataReq.body.toString().trim();
        if (
          dataReq.statusCode == 200 &&
          latestOptifine.length == 2 &&
          latestOptifine != versions.optifineVersion.trim() &&
          latestOptifine[0] > versions.optifineVersion[0]
        )
          currentSolutions.add(
            "- **" +
              language.get("MC_LOG_UPDATE", {
                item: "OptiFine",
                current: versions.optifineVersion,
                latest: latestOptifine,
              }) +
              "**"
          );
      }
    } else if (versions?.loader == Loaders.OPTIFINE) {
      const dataReq = await centra(
        `https://optifine.net/version/${versions.mcVersion}/HD_U.txt`
      )
        .header("User-Agent", this.client.manager.ua)
        .send();
      const latestOptifine = dataReq.body.toString();
      if (dataReq.statusCode == 200 && latestOptifine != versions.loaderVersion)
        currentSolutions.add(
          "- **" +
            language.get("MC_LOG_UPDATE", {
              item: "OptiFine",
              current: versions.optifineVersion,
              latest: latestOptifine,
            }) +
            "**"
        );
    }

    const isDefault = this.regexes.jvm.test(log);
    this.regexes.jvm.lastIndex = 0;
    if (log.includes("JVM Flags: ") && !isDefault)
      currentRecommendations.add(
        "- Unless you know what you're doing, modifying your JVM args could have unintended side effects. It's best to use the defaults."
      );

    if (versions?.mcVersion == "1.8.9") {
      const allocatedRam = this.regexes.ram.exec(log);
      this.regexes.ram.lastIndex = 0;
      if (parseInt(allocatedRam?.groups?.ram) > 4)
        currentRecommendations.add(
          `- Most of the time you don't need more than 2GB RAM allocated (maybe 3-4GB if you use skyblock mods). You may be able to reduce the amount of RAM allocated from ${
            allocatedRam.groups.ram + allocatedRam.groups.type
          } to ${allocatedRam[0].endsWith("G") ? "2G" : "2048M"} or ${
            allocatedRam[0].endsWith("G") ? "3G" : "3072M"
          }`
        );
    }

    for (const [rec, sol] of Object.entries(this.solutions.recommendations)) {
      if (
        log.toLowerCase().includes(rec.toLowerCase()) &&
        !currentSolutions.has(`- **${sol}**`)
      )
        currentRecommendations.add(`- ${sol}`);
    }

    if (versions.mods.length)
      for (const mod of versions.mods) {
        if (mod.modId.toLowerCase() in this.modVersions) {
          let latest =
            this.modVersions[mod.modId.toLowerCase()]?.[versions.mcVersion];
          if (mod.version == latest || !latest) continue;
          if (this.regexes.majorMinorOnly.test(latest)) latest = `${latest}.0`;
          const isSemVer = this.regexes.semver.test(latest);
          this.regexes.majorMinorOnly.lastIndex = 0;
          this.regexes.semver.lastIndex = 0;
          let isOutdated = false;
          if (isSemVer) {
            const latestMatch = this.regexes.semver.exec(latest);
            this.regexes.semver.lastIndex = 0;
            if (!latestMatch) {
              this.client.console.warn(
                `[MCLogs] Failed to match semver from latest version "${latest}"`
              );
              continue;
            }
            const {
              major: latestMajor,
              minor: latestMinor,
              patch: latestPatch,
              prerelease: latestPrerelease,
            } = latestMatch.groups;
            if (this.regexes.majorMinorOnly.test(mod.version))
              mod.version = `${mod.version}.0`;
            const currentMatch = this.regexes.semver.exec(mod.version);
            this.regexes.semver.lastIndex = 0;
            if (!currentMatch) {
              this.client.console.warn(
                `[MCLogs] Failed to match semver from current version`,
                mod
              );
              continue;
            }
            const { major, minor, patch, prerelease } = currentMatch.groups;
            const latestSemVer = `${latestMajor}.${latestMinor}.${latestPatch}`;
            const currentSemVer = `${major}.${minor}.${patch}`;
            if (prerelease)
              isOutdated =
                (currentSemVer < latestSemVer && !latestPrerelease) ||
                (currentSemVer == latestSemVer &&
                  prerelease != latestPrerelease);
            else isOutdated = currentSemVer < latestSemVer;
          } else isOutdated = mod.version != latest;
          if (isOutdated)
            currentRecommendations.add(
              "- " +
                language.get("MC_LOG_UPDATE", {
                  item: titleCase(mod.modId.replace(/_/g, " ")),
                  current: mod.version,
                  latest,
                })
            );
        }
      }

    this.getSolutionsAnalytics(
      user,
      haste,
      currentSolutions,
      currentRecommendations
    );

    const solutions = currentSolutions.size
      ? `Possible Solutions:\n${[...currentSolutions].join("\n")}`
      : "";
    const recommendations = currentRecommendations.size
      ? `${currentSolutions.size ? "\n\n" : ""}Recommendations:\n${[
          ...currentRecommendations,
        ].join("\n")}`
      : "";

    return solutions + recommendations;
  }

  async checkLogs(message: FireMessage) {
    // you should see what it's like without this lol
    if (message.author.bot) return;
    else if (!this.canUse(message.guild, message.author)) return;
    else if (
      message.member?.roles.cache.some(
        (r) => r.name == "fuckin' loser" || r.name == "no logs"
      )
    )
      return;
    else if (this.client.util.isBlacklisted(message.author.id, message.guild))
      return;

    const codeblock = getCodeblockMatch(message.content);
    if (codeblock && codeblock.language) return; // likely not a log

    if (this.regexes.noRaw.test(message.content)) {
      this.regexes.noRaw.lastIndex = 0;
      try {
        await message.delete();
      } catch {}
      return await message.channel.send({
        content: message.language.get("MC_LOG_NO_REUPLOAD", {
          user: message.author.toMention(),
        }) as string,
        allowedMentions: { users: [message.author.id] },
      });
    } else this.regexes.noRaw.lastIndex = 0;

    const reupload = this.regexes.reupload.exec(message.content);
    this.regexes.reupload.lastIndex = 0;
    if (reupload != null && reupload.length >= 3) {
      const domain = reupload[1];
      const key = reupload[2];
      message.content = message.content
        .replace(this.regexes.reupload, "")
        .trim();
      const url = `https://${domain}/${
        domain.includes("paste.ee") ? "r/" : "raw/"
      }${key}`;
      message.attachments.set(message.id, {
        setFile: function () {
          return this;
        },
        setName: function () {
          return this;
        },
        setDescription: function () {
          return this;
        },
        toJSON: () => {
          return {};
        },
        setSpoiler: function () {
          return this;
        },
        contentType: "text/plain; charset=utf-8",
        name: `${domain}/${key}.txt`,
        ephemeral: true,
        id: message.id,
        description: "",
        attachment: "",
        spoiler: false,
        proxyURL: url,
        height: 0,
        size: 0,
        width: 0,
        url,
      });
    }

    // this should always be "sent" not "sent a paste containing"
    if (!message.attachments.size && message.content.length > 350) {
      const processed = await this.processLogStream(message, message.content);
      if (processed && this.hasLogText(processed))
        return await this.handleLogText(
          message,
          processed,
          reupload != null ? "sent a paste containing" : "sent"
        );
    }

    for (const [, attach] of message.attachments.filter(
      (attachment) =>
        (attachment.name.endsWith(".log") ||
          attachment.name.endsWith(".txt")) &&
        attachment.size <= 8000000
    )) {
      try {
        // const text = await (await centra(attach.url).send()).text();
        let chunks: string[] = [];
        const stream = await centra(attach.url)
          .header("User-Agent", this.client.manager.ua)
          .stream()
          .send();
        for await (const chunk of stream as unknown as Readable) {
          chunks.push(chunk.toString());
          if (chunks.length >= 5 && !this.hasLogText(chunks.join(""))) {
            chunks = [];
            break;
          }
        }
        chunks = chunks.reverse();
        const processed: string[] = [];
        const triggeredCleaners = [];
        while (chunks.length) {
          const text: string[] = [];
          for (
            let i = 0;
            i < 5;
            i++ // add up to 5 chunks
          ) {
            if (chunks.length) {
              const chunk = chunks.pop();
              if (
                !message.guild?.hasExperiment(77266757, 2) ||
                !mcLogFilters.some((filter) => chunk.includes(filter))
              )
                text.push(chunk);
              else {
                for (const line of chunk.split("\n")) {
                  if (!mcLogFilters.some((filter) => line.includes(filter))) {
                    text.push(line);
                    continue;
                  }
                  const triggered =
                    mcLogFilters.find((filter) => line.includes(filter)) ?? "";
                  if (!triggeredCleaners.some((l) => l.includes(triggered)))
                    triggeredCleaners.push(
                      `Line: ${line.trim()}\nFilter: ${triggered}\n`
                    );
                }
              }
            }
          }
          const data = await this.processLogStream(message, text.join(""));
          if (data) processed.push(data);
        }

        if (triggeredCleaners.length)
          processed.push(
            ...[
              "\n\n\n",
              "This log triggered some filters to clean up spammy logs. Knowing which filters were triggered may help diagnosing the issue so here you go:\n",
              triggeredCleaners.join("\n"),
            ]
          );

        if (
          processed.length &&
          processed.some((chunk) => this.hasLogText(chunk))
        )
          await this.handleLogText(message, processed.join(""), "uploaded");
      } catch (e) {
        this.client.console.debug(`[MCLogs] Failed to process log,`, e.stack);
        await message.send("MC_LOG_READ_FAIL");
      }
    }
  }

  private async processLogStream(message: FireMessage, data: string) {
    data = data
      .replace(this.regexes.email, "[removed email]")
      .replace(this.regexes.home, "USER.HOME")
      .replace(this.regexes.url, (match: string) => {
        if (allowedURLs.some((allowed) => match.includes(allowed)))
          return match;
        else return "[removed url]";
      });

    const filters = this.client.getModule("filters") as Filters;
    data = await filters.runReplace(data, message);

    data = data
      .split("\n")
      // filter imports as this often makes java code mistaken for logs

      // and the essential relaunch warning since people are stupid and
      // think they should add it
      .filter(
        (line) =>
          !line.startsWith("import ") && !line.includes('Add "-Dessential')
      )
      .join("\n");

    return data;
  }

  async handleLogText(message: FireMessage, text: string, msgType: string) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (this.regexes.secrets.test(line)) {
        this.regexes.secrets.lastIndex = 0;
        text = text.replace(line, "[line removed to protect sensitive info]");
      }
      this.regexes.secrets.lastIndex = 0;
    }

    text = text.replace(this.regexes.secrets, "[secrets removed]");

    const mcInfo = this.getMCInfo(text);
    let modsHaste: string;
    if (mcInfo.mods.length) {
      const haste = await this.client.util
        .haste(JSON.stringify(mcInfo.mods, null, 2), true, "json", true)
        .catch((e: Error) => e);
      if (!(haste instanceof Error) && haste.raw) modsHaste = haste.raw;
    }

    try {
      const haste = await this.client.util
        .haste(text, false, "", true)
        .catch((e: Error) => e);
      if (haste instanceof Error)
        return await message.error("MC_LOG_FAILED", { error: haste.message });
      // user has not opted out of data collection for analytics
      else if (!message.hasExperiment(2219986954, 1))
        this.client.influx([
          {
            measurement: "mclogs",
            tags: {
              type: "upload",
              user_id: message.author.id,
              cluster: this.client.manager.id.toString(),
              shard: message.guild
                ? message.guild?.shardId.toString() ?? "0"
                : "Unknown",
            },
            fields: {
              guild: message.guild
                ? `${message.guild?.name} (${message.guildId})`
                : "Unknown",
              user: `${message.author} (${message.author.id})`,
              msgType,
              haste: haste.url,
              loader: mcInfo?.loader,
              loader_version: mcInfo?.loaderVersion,
              mc_version: mcInfo?.mcVersion,
              raw: haste.raw,
              mods: modsHaste,
            },
          },
        ]);
      message.delete().catch(() => {});

      let possibleSolutions = await this.getSolutions(
        message.member ?? message.author,
        mcInfo,
        haste,
        text
      );
      const user = this.regexes.settingUser.exec(text);
      this.regexes.settingUser.lastIndex = 0;
      const isDevEnv =
        this.regexes.devEnvUser.test(user?.[1]) && text.includes("GradleStart");
      this.regexes.devEnvUser.lastIndex = 0;
      if (user?.length && !isDevEnv) {
        try {
          const uuid = await this.client.util.nameToUUID(user[1]);
          if (!uuid) {
            // user has not opted out of data collection for analytics
            if (!message.hasExperiment(2219986954, 1))
              this.client.influx([
                {
                  measurement: "mclogs",
                  tags: {
                    type: "cracked",
                    user_id: message.author.id,
                    cluster: this.client.manager.id.toString(),
                    shard: message.guild
                      ? message.guild?.shardId.toString() ?? "0"
                      : "Unknown",
                  },
                  fields: {
                    guild: message.guild
                      ? `${message.guild?.name} (${message.guildId})`
                      : "Unknown",
                    user: `${message.author} (${message.author.id})`,
                    ign: user[1],
                    haste: haste.url,
                    raw: haste.raw,
                  },
                },
              ]);
            possibleSolutions =
              "It seems you may be using a cracked version of Minecraft. If you are, please know that we do not support piracy. Buy the game or don't play the game";
          } else if (!message.hasExperiment(2219986954, 1))
            // user has not opted out of data collection for analytics
            this.client.influx([
              {
                measurement: "mclogs",
                tags: {
                  type: "user",
                  user_id: message.author.id,
                  cluster: this.client.manager.id.toString(),
                  shard: message.guild
                    ? message.guild?.shardId.toString() ?? "0"
                    : "Unknown",
                },
                fields: {
                  guild: message.guild
                    ? `${message.guild?.name} (${message.guildId})`
                    : "Unknown",
                  user: `${message.author} (${message.author.id})`,
                  ign: user[1],
                  uuid,
                  haste: haste.url,
                  raw: haste.raw,
                },
              },
            ]);
        } catch {}
      }

      const allowedMentions = { users: [message.author.id] };
      const components = [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("LINK")
            .setURL(haste.url ?? "https://google.com/something_broke_lol")
            .setLabel(message.language.get("MC_LOG_VIEW")),
          new MessageButton()
            .setStyle("LINK")
            .setURL(haste.raw ?? "https://google.com/something_broke_lol")
            .setLabel(message.language.get("MC_LOG_VIEW_RAW")),
        ]),
      ];

      const details = [];
      if (mcInfo.javaVersion)
        details.push(
          (message.guild ?? message).language.get("MC_LOG_JVM_INFO", {
            type: mcInfo.jvmType.trim() ?? "Unknown JVM type",
            version: mcInfo.javaVersion.trim(),
          })
        );
      if (mcInfo.loader)
        details.push(
          (message.guild ?? message).language.get("MC_LOG_LOADER_INFO", {
            version: mcInfo.loaderVersion.trim(),
            minecraft: mcInfo.mcVersion.trim(),
            loader: mcInfo.loader.trim(),
          })
        );
      if (mcInfo.optifineVersion && mcInfo.loader != Loaders.OPTIFINE)
        details.push(
          (message.guild ?? message).language.get("MC_LOG_OPTIFINE_INFO", {
            version: mcInfo.optifineVersion.trim(),
          })
        );

      const logHaste = (message.guild ?? message).language
        .get("MC_LOG_HASTE", {
          extra: msgType == "uploaded" ? message.content : "",
          details: details.map((d) => `- ${d}`).join("\n"),
          user: message.author.toMention(),
          solutions: possibleSolutions,
          msgType,
        })
        .trim();

      if (logHaste.length <= 2000)
        return await message.channel.send({
          content: logHaste,
          allowedMentions,
          components,
        });
      else {
        if (logHaste.length <= 4096)
          return await message.channel.send({
            embeds: [new MessageEmbed().setDescription(logHaste)],
            allowedMentions,
            components,
          });
        else
          return await message.channel.send({
            content: (message.guild ?? message).language.get(
              mcInfo.loader ? "MC_LOG_HASTE_WITH_LOADER" : "MC_LOG_HASTE",
              {
                extra: msgType == "uploaded" ? message.content : "",
                solutions: (message.guild ?? message).language.get(
                  "MC_LOG_WTF"
                ),
                user: message.author.toMention(),
                version: mcInfo.loaderVersion,
                minecraft: mcInfo.mcVersion,
                loader: mcInfo.loader,
                msgType,
              }
            ),
            allowedMentions,
            components,
          });
      }
    } catch (e) {
      this.client.console.error(
        `[MCLogs] Failed to create log haste\n${e.stack}`
      );
    }
  }

  hasLogText(text: string) {
    return this.logText.some((logText) => text.includes(logText));
  }
}
