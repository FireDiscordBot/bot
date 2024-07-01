import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { IPoint } from "@fire/lib/interfaces/aether";
import { FabricLoaderVersion } from "@fire/lib/interfaces/fabricmc";
import { ForgePromotions } from "@fire/lib/interfaces/minecraftforge";
import {
  MojangAPIError,
  ProfileNotFoundError,
  validPasteURLs,
} from "@fire/lib/util/clientutil";
import { constants, titleCase } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";
import {
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { lt as semverLessThan, gt as semverGreaterThan } from "semver";
import { getCodeblockMatch } from "../arguments/codeblock";
import Filters from "./filters";

const { mcLogFilters, regexes } = constants;

const clientDetection = {
  lunar: [
    "com.moonsworth.lunar",
    "[lc] starting lunar client...",
    "client brand changed to 'lunarclient",
  ],
  badlion: [
    "net.badlion.client.",
    "badlion client loading start",
    "Loading BLC START...",
  ],
};

enum LogType {
  VANILLA = "VANILLA_LOG",
  LATEST = "LATEST_LOG",
  DEBUG = "DEBUG_LOG",
  CRASH_REPORT = "CRASH_REPORT",
  JVM_CRASH = "JVM_CRASH",
  UNKNOWN = "LOG",
}

enum Loaders {
  FORGE = "Forge",
  FABRIC = "Fabric",
  QUILT = "Quilt",
  OPTIFINE = "Vanilla w/OptiFine HD U", // will be shown as "Vanilla w/OptiFine HD U H4"
  FEATHER_FORGE = "Feather on Forge", // Feather's version will be inserted before displaying
  FEATHER_FABRIC = "Feather on Fabric", // same here
}

type ModLoaders = "Forge" | "Fabric" | "Quilt";

const validEssentialLoaders = [
  Loaders.FORGE,
  Loaders.FEATHER_FORGE,
  Loaders.FABRIC,
  Loaders.FEATHER_FABRIC,
];

const ESSENTIAL_TO_SEMVER_REGEX = /(?<main>\d\.\d\.\d)(\.(?<last>\d))/gim;
const essentialVersionToSemver = (version: string) =>
  version.replace(ESSENTIAL_TO_SEMVER_REGEX, "$1-$3");

type ModSource = `${string}.jar`;

export type MinecraftVersion =
  | `${number}.${number}.${number}`
  | `${number}.${number}`;
export type ModVersions = {
  [version: MinecraftVersion]: { [loader in ModLoaders]?: string };
};
export type ModVersionData = {
  versions: ModVersions;
  alternateModIds?: string[];
};

export interface OptifineVersion {
  name: string;
  shortName: string;
  forgeVersion: string;
  releaseDate: Date;
  fileName: string;
}

type Haste = { url: string; raw: string };
type LoaderRegexConfig = {
  loader: Loaders;
  regexes: RegExp[];
};
type VersionInfo = {
  logType: LogType;
  loader: Loaders;
  mcVersion: MinecraftVersion;
  loaderVersion: string;
  optifineVersion: string;
  featherVersion: string;
  javaVersion: string;
  jvmType: string;
  mods: ModInfo[];
};
type ForgeModNonPartial = {
  state: string;
  modId: string;
  version: string;
  source: ModSource;
  erroredDependencies: DependencyInfo[];
  partial: false;
};
type ForgeEssentialMod = {
  state: string;
  modId: "essential" | "essential-container";
  commit: string;
  branch: string;
  version: string;
  source: ModSource;
  erroredDependencies: DependencyInfo[];
  partial: false;
};
type FabricModNonPartial = {
  modId: string;
  version: string;
  subMods: FabricModNonPartial[];
  partial: false;
};
type FabricEssentialMod = {
  modId: "essential" | "essential-container";
  commit: string;
  branch: string;
  version: string;
  partial: false;
};
type PartialMod = {
  modId: string;
  erroredDependencies: DependencyInfo[];
  partial: true;
};
export type ModInfo =
  | ForgeModNonPartial
  | ForgeEssentialMod
  | PartialMod
  | FabricModNonPartial
  | FabricEssentialMod;
type DependencyInfo = {
  name: string;
  requiredVersion: string;
  actual: string;
};

const classicForgeModsHeader =
  "States: 'U' = Unloaded 'L' = Loaded 'C' = Constructed 'H' = Pre-initialized 'I' = Initialized 'J' = Post-initialized 'A' = Available 'D' = Disabled 'E' = Errored";
const forgeDependenciesErrors = [
  "[main/ERROR]: Missing or unsupported mandatory dependencies:",
  "[main/ERROR] [net.minecraftforge.fml.loading.ModSorter/LOADING]: Missing or unsupported mandatory dependencies:",
];
const missingDep = "[MISSING]";

const crashReportHeader = "---- Minecraft Crash Report ----";
const jvmCrashHeader =
  "# A fatal error has been detected by the Java Runtime Environment:";
const jvmCrashLines = [
  "# Problematic frame:",
  "---------------  T H R E A D  ---------------",
];
const vanillaLogFirstLines = [
  "[Datafixer Bootstrap/INFO]",
  "[Client thread/INFO]: Setting user: ",
];

const modIdClean = /_|\-/g;
const subSubMod = "|    \\--";

const patcherAMDIssue = {
  hasPatcherAndAMD: `- **If you have started crashing recently when joining a server, you'll need to disable Patcher's entity culling by going to \`.minecraft/config\`, opening the \`patcher.toml\` file and changing \`entity_culling = true\` to \`entity_culling = false\`.
This is caused by a new AMD driver update that appears to be a complete rewrite of the driver. If you suffer a large performance hit after disabling entity culling, you can try downgrading your GPU driver instead**`,
  hasPatcherGPUUnknown: `- **If you have started crashing recently when joining a server & have an AMD GPU, you'll need to disable Patcher's entity culling by going to \`.minecraft/config\`, opening the \`patcher.toml\` file and changing \`entity_culling = true\` to \`entity_culling = false\`.
This is caused by a new AMD driver update that appears to be a complete rewrite of the driver. If you suffer a large performance hit after disabling entity culling, you can try downgrading your GPU driver instead**`,
  noPatcherAndAMD: `- **If you're using Patcher & have started crashing recently when joining a server, you'll need to disable entity culling by going to \`.minecraft/config\`, opening the \`patcher.toml\` file and changing \`entity_culling = true\` to \`entity_culling = false\`.
  This is caused by a new AMD driver update that appears to be a complete rewrite of the driver. If you suffer a large performance hit after disabling entity culling, you can try downgrading your GPU driver instead**`,
  noPatcherGPUUnknown: `- **If you have started crashing recently when joining a server, are using Patcher & have an AMD GPU, you'll need to disable entity culling by going to \`.minecraft/config\`, opening the \`patcher.toml\` file and changing \`entity_culling = true\` to \`entity_culling = false\`.
  This is caused by a new AMD driver update that appears to be a complete rewrite of the driver. If you suffer a large performance hit after disabling entity culling, you can try downgrading your GPU driver instead**`,
};

export default class MCLogs extends Module {
  statsTask: NodeJS.Timeout;
  regexes: {
    noRaw: RegExp;
    secrets: RegExp;
    jvm: RegExp;
    optifine: RegExp;
    exOptifine: RegExp;
    ram: RegExp;
    email: RegExp;
    home: RegExp;
    settingUser: RegExp;
    devEnvUser: RegExp;
    uuidArg: RegExp;
    essentialAuth: RegExp;
    multiMcDisabled: RegExp;
    loaderVersions: LoaderRegexConfig[];
    forgeModsTableHeader: RegExp;
    forgeModsTableEntry: RegExp;
    classicForgeModsEntry: RegExp;
    forgeValidModFile: RegExp;
    forgeDependenciesError: RegExp;
    fabricModsHeader: RegExp;
    classicFabricModsEntry: RegExp;
    fabricModsEntry: RegExp;
    fabricSubModEntry: RegExp;
    fabricCrashModsHeader: RegExp;
    fabricCrashModEntry: RegExp;
    fabricCrashSubModEntry: RegExp;
    essentialVersion: RegExp;
    fullLogJavaVersion: RegExp;
    crashReportJavaVersion: RegExp;
    jvmCrashJavaVersion: RegExp;
    date: RegExp;
    semver: RegExp;
    majorMinorOnly: RegExp;
  };
  logText: string[];
  bgs: {
    versions: {
      [version: MinecraftVersion]: {
        solutions: {
          [key: string]: string;
        };
        recommendations: {
          [key: string]: string;
        };
      };
    };
    solutions: { [key: string]: string };
    recommendations: { [key: string]: string };
    cheats: string[];
  };

  constructor() {
    super("mclogs");
    this.bgs = {
      versions: {},
      solutions: {},
      recommendations: {},
      cheats: [],
    };
    this.regexes = {
      noRaw: /(justpaste\.it)\/(\w+)/gim,
      secrets:
        /--accessToken,? [^\?\s]+|\(Session ID is token:|Authorization ?: ?(Bearer\n?\w*)/gim,
      jvm: /JVM Flags: (8|7) total;(?: -XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump)? -Xmx(?:\d{1,2}G|\d{3,5}M) -XX:\+UnlockExperimentalVMOptions -XX:\+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M/gim,
      optifine:
        /OptiFine_(?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)_HD_U_(?<ofver>[A-Z]\d(?:_pre\d{1,2})?)/im,
      exOptifine: /HD_U_\w\d_MOD/gm,
      ram: /-Xmx(?<ram>\d{1,2}G|\d{3,4}M)/gim,
      email: /[\w.+-]{1,50}@[\w-]{1,50}\.[a-zA-Z-.]{1,10}/gim,
      home: /(\/Users\/[\w\sÀ-ÖØ-öø-ÿ]+|\/home\/\w+|C:\\Users\\[\w\sÀ-ÖØ-öø-ÿ]+)/gim,
      settingUser:
        /(?:\/INFO]: Setting user: (\w{1,16})|--username,? (\w{1,16}))/gim,
      devEnvUser: /Player\d{3}/gim,
      uuidArg:
        /--uuid,? (?:(?<uuid>[0-9A-F]{8}-?[0-9A-F]{4}-?(?<ver>[0-9A-F])[0-9A-F]{3}-?[89AB][0-9A-F]{3}-?[0-9A-F]{12})|(?<invalid>\w*))/gim,
      essentialAuth:
        /Authenticating to Mojang as (?<ign>\w{1,16}) \((?<uuid>[0-9A-F]{8}-?[0-9A-F]{4}-?(?<ver>[0-9A-F])[0-9A-F]{3}-?[89AB][0-9A-F]{3}-?[0-9A-F]{12})\)/gim,
      multiMcDisabled: /^\s*\[❌] .* \(disabled\)$/gim,
      forgeModsTableHeader:
        /\|\sState\s*\|\sID\s*\|\sVersion\s*\|\sSource\s*\|(?:\sSignature\s*\|)?/gim,
      forgeModsTableEntry:
        /\s*(?<state>[ULCHIJADE]+)\s*\|\s*(?<modid>[a-z][a-z0-9_.-]{1,63})\s*\|\s*(?<version>[\w\-\+\.!\[\]]+)\s*\|\s*(?<source>[\w\s\-\+\.'`!()\[\]]+\.jar)\s*\|/gim,
      classicForgeModsEntry:
        /(?<state>[ULCHIJADE]+)\s+(?<modid>[a-z][a-z0-9_.-]{1,63})\{(?<version>[\w\-\+\.!\[\]\*]+|@VER)\}\s+\[(?<name>[^\]]+)\]\s+\((?<source>[\w\s\-\+\.'`!()\[\]]+\.jar)\)\s*$/gim,
      forgeValidModFile:
        /Found valid mod file (?<source>[\w\s\-\+\.'`!()\[\]]+\.jar) with {(?<modid>[a-z][a-z0-9_.-]{1,63}(?:,[a-z][a-z0-9_.-]{1,63})*)} mods - versions {(?<version>[\w\-\+\.!\[\]]+(?:,[\w\s\-\+\.!\[\]]+)*)}/gim,
      forgeDependenciesError:
        /Mod ID: '(?<dep>[a-z][a-z0-9_.-]{1,63})', Requested by: '(?<requiredby>[a-z][a-z0-9_.-]{1,63})', Expected range: '[\(\[](?<low>[\w\.\-+]+),(?<high>[\w\.\-+]+)?[\)\]]', Actual version: '(?<actual>[\w\.\-+]+|\[MISSING\])'/gim,
      fabricModsHeader:
        /\[main\/INFO]:? (?:\(FabricLoader\) )?Loading \d{1,4} mods:/gim,
      classicFabricModsEntry:
        /^\s+\- (?<modid>[a-z0-9_\-]{2,}) (?<version>[\w\.\-+]+)(?: via (?<via>[a-z0-9_\-]{2,}))?$/gim,
      fabricModsEntry:
        /^\s+\- (?<modid>[a-z0-9_\-]{2,}) (?<version>[\w\.\-+]+)$/gim,
      fabricSubModEntry:
        /^\s+(?<subtype>\\--|\|--|\|\s+\\--) (?<modid>[a-z0-9_\-]{2,}) (?<version>[\w\.\-+]+)$/gim,
      fabricCrashModsHeader: /^\tFabric Mods: $/gim,
      fabricCrashModEntry:
        /^\t{2}(?<modid>[a-z0-9_\-]{2,}): (?<name>.+) (?<version>[\w\.\-+]+)$/gim,
      fabricCrashSubModEntry:
        /^\t{3}(?<modid>[a-z0-9_\-]{2,}): (?<name>.+) (?<version>[\w\.\-+]+)$/gim,
      essentialVersion:
        /Starting Essential v(?<version>\d\.\d\.\d\.\d) \(#(?<commit>\b[0-9a-f]{10})\) \[(?<branch>\w*)\]/gim,
      fullLogJavaVersion:
        /Java is (?<name>.* VM), version (?<version>\d*\.\d*\.\d*(?:_\d{1,3})?(?:-b\d{1,3})?). running on (?<os>(?<osname>[\w\s]*):(?<osarch>\w*):(?<osversion>.*)), installed at (?<path>.*)$/gim,
      crashReportJavaVersion:
        /Java Version: (?<version>\d*\.\d*\.\d*(?:_\d{1,3})?(?:-b\d{1,3})?).*\n\s*Java VM Version: (?<name>.* VM)/gim,
      jvmCrashJavaVersion:
        /^vm_info: (?<name>.* VM) \(.*\) for (?<os>(?<osname>[\w\s]*)-(?<osarch>\w*)) JRE \((?<version>\d*\.\d*\.\d*(?:_\d{1,3})?(?:-b\d{1,3})?)\)/gim,
      loaderVersions: [
        // The Feather regexes need to be above the regular loader regexes since otherwise, they'd be matched by the regular ones
        {
          loader: Loaders.FEATHER_FABRIC,
          regexes: [
            /Loading Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?) with Fabric Loader (?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FABRIC,
          regexes: [
            /Loading for game Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /fabricloader(?:@|\s*)(?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FABRIC,
          regexes: [
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /fabricloader: Fabric Loader (?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FABRIC,
          regexes: [
            /Loading Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?) with Fabric Loader (?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
          ],
        },
        {
          loader: Loaders.FABRIC,
          regexes: [
            /Loading for game Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /fabricloader(?:@|\s*)(?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
          ],
        },
        {
          loader: Loaders.FABRIC,
          regexes: [
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /fabricloader: Fabric Loader (?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
          ],
        },
        {
          loader: Loaders.QUILT,
          regexes: [
            /Loading Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?) with Quilt Loader (?<loaderver>\d\.\d{1,3}\.\d{1,3})/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /Forge Mod Loader version (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}) for Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?) loading/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /Forge mod loading, version (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}), for MC (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /--version,? (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-forge-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,

            // below is a variation of the above regex, but for some reason it has the minecraft version THREE TIMES and idk why. it seems to only show in JVM crashes (hs_err_pid.log files)
            /--version,? (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-forge(?:\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)?-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})-(?:\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,

            // and then we have this.
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /Launched Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-forge(?:\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)?-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /Launched Version: forge-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /--fml\.forgeVersion,? (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
            /--fml\.mcVersion,? (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FEATHER_FORGE,
          regexes: [
            /FML: MCP (?:\d{1,5}\.\d{1,5}) Powered by Forge (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /Started Feather \((?<featherver>\w*)\)/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Forge Mod Loader version (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}) for Minecraft (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?) loading/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Forge mod loading, version (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5}), for MC (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /--version, (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-forge-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,

            // below is a variation of the above regex, but for some reason it has the minecraft version THREE TIMES and idk why. it seems to only show in JVM crashes (hs_err_pid.log files)
            /--version (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-forge(?:\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)?-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})-(?:\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Launched Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-forge(?:\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)?-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /Launched Version: forge-(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
            /Forge: net.minecraftforge:(?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /--fml\.forgeVersion,? (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
            /--fml\.mcVersion,? (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
          ],
        },
        {
          loader: Loaders.FORGE,
          regexes: [
            /FML: MCP (?:\d{1,5}\.\d{1,5}) Powered by Forge (?<loaderver>(?:\d{1,2}\.)?\d{1,3}\.\d{1,3}\.\d{1,5})/gim,
            /Minecraft Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)/gim,
          ],
        },
        {
          loader: Loaders.OPTIFINE,
          regexes: [
            /Launched Version: (?<mcver>\d\.\d{1,2}(?:\.\d{1,2})?(?:-pre\d)?)-OptiFine_HD_U_(?<loaderver>[A-Z]\d(?:_pre\d{1,2})?)/gim,
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
      "net.fabricmc.loader.impl.launch.knot.KnotClient",
      "net.minecraftforge.fml.common.launcher.FMLTweaker",
      "Launched instance in online mode",
      "# A fatal error has been detected by the Java Runtime Environment:",
      "---- Minecraft Crash Report ----",
      "A detailed walkthrough of the error",
      "launchermeta.mojang.com",
      "Running launcher bootstrap",
      "Running launcher core",
      "Native Launcher Version:",
      "[Client thread/INFO]: Setting user:",
      "[Client thread/INFO]: (Session ID is",
      "MojangTricksIntelDriversForPerformance",
      "Loading for game Minecraft ",
      "[main/INFO]: [FabricLoader] Loading ",
      "[main/INFO]: (FabricLoader) Loading ",
      ".minecraft/libraries/net/fabricmc",
      "net.fabricmc.loader.launch",
      "net.fabricmc.loader.game",
      "net.minecraftforge",
      // "gg.essential",
      "club.sk1er",
      "fabric-api",
      "Environment: authHost='https://authserver.mojang.com'",
      " with Fabric Loader ",
      "net/digitalingot/feather-server-api-proto",
      'Essential branch set to "stable" via default.',
    ];
  }

  get modVersions() {
    return this.client.manager.state.modVersions;
  }

  getMainModId(modId: string) {
    modId = modId.toLowerCase();
    if (this.modVersions[modId]) return modId;
    else
      for (const [mainId, data] of Object.entries(this.modVersions)) {
        if (data.alternateModIds?.includes(modId)) return mainId;
      }
    // if we end up here, it's likely unknown so we'll just return the input
    return modId;
  }

  private canUse(guild?: FireGuild, user?: FireUser) {
    if (guild)
      return (
        guild.hasExperiment(77266757, [1, 2]) ||
        (guild.premium && guild.settings.get("minecraft.logscan", false))
      );
    else if (user) return user.isSuperuser() || user.premium;
  }

  async init() {
    await this.client.waitUntilReady();
    this.bgs = {
      versions: {},
      solutions: {},
      recommendations: {},
      cheats: [],
    };
    const solutionsReq = await centra(
      `https://api.github.com/repos/GamingGeek/BlockGameSolutions/contents/mc_solutions.json`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", `token ${process.env.GITHUB_SOLUTIONS_TOKEN}`)
      .header("X-GitHub-Api-Version", "2022-11-28")
      .send();
    if (solutionsReq.statusCode == 200) {
      const solutions = await solutionsReq.json().catch(() => {});
      if (solutions?.content)
        this.bgs = JSON.parse(
          Buffer.from(solutions.content, "base64").toString("utf8")
        );
    }
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
          .haste(JSON.stringify([...solutions.values()]), true, "json", true)
          .catch(() => undefined);
      if (recommendations.size)
        recommendationsHaste = await this.client.util
          .haste(
            JSON.stringify([...recommendations.values()]),
            true,
            "json",
            true
          )
          .catch(() => undefined);
      if (solutionsHaste || recommendationsHaste) {
        const point: IPoint = {
          measurement: "mclogs",
          tags: {
            type: "bgs",
            user_id: user.id,
            cluster: this.client.manager.id.toString(),
            shard:
              user instanceof FireMember ? user.guild.shardId.toString() : "0",
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
        this.client.writeToInflux([point]);
      }
    }
  }

  private getMCInfo(
    log: string,
    splitLog: string[],
    lang: Language
  ): VersionInfo {
    let logType: LogType,
      loader: Loaders,
      mcVersion: MinecraftVersion,
      loaderVersion: string,
      optifineVersion: string,
      featherVersion: string,
      mods: ModInfo[] = [],
      javaVersion: string,
      javaVendor: string;

    if (splitLog[0].trim() == crashReportHeader) logType = LogType.CRASH_REPORT;
    else if (vanillaLogFirstLines.some((l) => splitLog[0].trim().includes(l)))
      logType = LogType.VANILLA;
    else if (
      splitLog[1] == jvmCrashHeader ||
      jvmCrashLines.some((l) => log.includes(l))
    )
      logType = LogType.JVM_CRASH;
    else if (log.includes("[main/DEBUG]")) logType = LogType.DEBUG;
    else if (log.includes("[main/INFO]")) logType = LogType.LATEST;
    else logType = LogType.UNKNOWN;

    for (const config of this.regexes.loaderVersions) {
      const matches = config.regexes.map((regex) => regex.exec(log));
      config.regexes.forEach((regex) => (regex.lastIndex = 0));
      for (const match of matches) {
        if (match?.groups?.mcver)
          mcVersion = match.groups.mcver as MinecraftVersion;
        if (match?.groups?.loaderver) loaderVersion = match.groups.loaderver;
        if (
          (config.loader == Loaders.FEATHER_FORGE ||
            config.loader == Loaders.FEATHER_FABRIC) &&
          match?.groups?.featherver
        )
          featherVersion = match.groups.featherver;
        if (
          mcVersion &&
          loaderVersion &&
          (config.loader == Loaders.FEATHER_FORGE ||
          config.loader == Loaders.FEATHER_FABRIC
            ? featherVersion
            : true)
        )
          loader = config.loader;
        else if (
          // reset if we're on Feather without its version
          config.loader == Loaders.FEATHER_FORGE ||
          config.loader == Loaders.FEATHER_FABRIC
        )
          mcVersion = loaderVersion = undefined;
      }
      if (loader && mcVersion && loaderVersion) break;
    }

    if (!(loader && mcVersion && loaderVersion))
      (loader = undefined),
        (mcVersion = undefined),
        (loaderVersion = undefined);

    if (loader == Loaders.OPTIFINE)
      (optifineVersion = loaderVersion),
        (loaderVersion = loaderVersion.replace("_", " ").trim());
    else {
      let optifineMatch: RegExpExecArray;
      while ((optifineMatch = this.regexes.optifine.exec(log))) {
        if (optifineMatch?.groups?.ofver && optifineMatch?.groups?.mcver) break;
        else optifineMatch = null;
      }
      this.regexes.optifine.lastIndex = 0;
      if (optifineMatch && optifineMatch?.groups?.mcver == mcVersion) {
        optifineVersion = optifineMatch.groups.ofver.replace("_", " ").trim();
        if (loader == Loaders.FORGE)
          mods.push({
            state: "Unknown",
            modId: "optifine",
            version: optifineVersion,
            source: `${optifineMatch[0]}.jar`,
            erroredDependencies: [],
            partial: false,
          });
      }
    }

    if (
      loader == Loaders.FORGE &&
      this.regexes.forgeModsTableHeader.test(log)
    ) {
      const modsTableIndex = splitLog.findIndex(
        (v) =>
          v.includes("State") &&
          v.includes("ID") &&
          v.includes("Version") &&
          v.includes("Source")
      );
      const modsTable = splitLog.slice(modsTableIndex + 2); // start at mods table, while loop should stop at end
      let modMatch: RegExpExecArray;
      while (
        (modMatch = this.regexes.forgeModsTableEntry.exec(modsTable.shift()))
      ) {
        this.regexes.forgeModsTableEntry.lastIndex = 0;
        if (!mods.find((i) => i.modId == modMatch.groups.modid))
          mods.push({
            state: modMatch.groups.state,
            modId: modMatch.groups.modid,
            version: modMatch.groups.version,
            source: modMatch.groups.source as ModSource,
            erroredDependencies: [],
            partial: false,
          });
      }
      this.regexes.forgeModsTableHeader.lastIndex = 0;
    } else if (
      loader == Loaders.FORGE &&
      log.includes(classicForgeModsHeader)
    ) {
      const modsTableIndex = splitLog.findIndex((v) =>
        v.includes(classicForgeModsHeader)
      );
      const modsTable = splitLog.slice(modsTableIndex + 1); // start at mods list, while loop should stop at end
      let modMatch: RegExpExecArray;
      while (
        (modMatch = this.regexes.classicForgeModsEntry.exec(modsTable.shift()))
      ) {
        this.regexes.classicForgeModsEntry.lastIndex = 0;
        if (!mods.find((i) => i.modId == modMatch.groups.modid))
          mods.push({
            state: modMatch.groups.state,
            modId: modMatch.groups.modid,
            version: modMatch.groups.version,
            source: modMatch.groups.source as ModSource,
            erroredDependencies: [],
            partial: false,
          });
      }
    } else if (
      loader == Loaders.FORGE &&
      this.regexes.forgeValidModFile.test(log)
    ) {
      this.regexes.forgeValidModFile.lastIndex = 0;
      for (const line of splitLog) {
        const modMatch = this.regexes.forgeValidModFile.exec(line);
        this.regexes.forgeValidModFile.lastIndex = 0;
        if (!modMatch) continue;
        if (modMatch.groups.modid.includes(",")) {
          const modIds = modMatch.groups.modid.split(","),
            versions = modMatch.groups.version.split(",");
          if (modIds.length == versions.length)
            for (const [index, modId] of modIds.entries())
              mods.push({
                state: "Unknown",
                modId,
                version: versions[index],
                source: modMatch.groups.source as ModSource,
                erroredDependencies: [],
                partial: false,
              });
          // we don't have all pairs so let's just use the first
          else
            mods.push({
              state: "Unknown",
              modId: modIds[0],
              version: versions[0],
              source: modMatch.groups.source as ModSource,
              erroredDependencies: [],
              partial: false,
            });
        } else if (!mods.find((i) => i.modId == modMatch.groups.modid))
          mods.push({
            state: "Unknown",
            modId: modMatch.groups.modid,
            version: modMatch.groups.version,
            source: modMatch.groups.source as ModSource,
            erroredDependencies: [],
            partial: false,
          });
      }
    } else if (
      loader == Loaders.FABRIC &&
      this.regexes.fabricModsHeader.test(log)
    ) {
      this.regexes.fabricModsHeader.lastIndex = 0;
      const useClassic = loaderVersion <= "0.14.14"; // 0.14.15 introduced a newer format
      const modsHeaderIndex = splitLog.findIndex((v) =>
        this.regexes.fabricModsHeader.test(v)
      );
      const modsList = splitLog.slice(modsHeaderIndex + 1); // start at mods list, while loop should stop at end
      let modMatch: RegExpExecArray;
      if (useClassic) {
        const tempSubMods: Record<string, FabricModNonPartial[]> = {};
        while (
          (modMatch = this.regexes.classicFabricModsEntry.exec(
            modsList.shift()
          ))
        ) {
          this.regexes.classicFabricModsEntry.lastIndex = 0;
          if (!mods.find((i) => i.modId == modMatch.groups.modid)) {
            if (modMatch.groups.via) {
              const parentMod = mods.find(
                (i) => i.modId == modMatch.groups.via
              );
              if (parentMod && "subMods" in parentMod)
                parentMod.subMods.push({
                  modId: modMatch.groups.modid,
                  version: modMatch.groups.version,
                  subMods: [], // don't think it can have any but this is just to make TS happy
                  partial: false,
                });
              else {
                const via = modMatch.groups.via;
                if (!tempSubMods[via]) tempSubMods[via] = [];
                tempSubMods[via].push({
                  modId: modMatch.groups.modid,
                  version: modMatch.groups.version,
                  subMods: [],
                  partial: false,
                });
              }
            } else {
              mods.push({
                modId: modMatch.groups.modid,
                version: modMatch.groups.version,
                subMods: tempSubMods[modMatch.groups.modid] || [],
                partial: false,
              });
              delete tempSubMods[modMatch.groups.modid];
            }
          }
        }
      } else {
        let nextMod = modsList.shift();
        while (
          (modMatch =
            this.regexes.fabricModsEntry.exec(nextMod) ||
            this.regexes.fabricSubModEntry.exec(nextMod))
        ) {
          this.regexes.fabricModsEntry.lastIndex = 0;
          this.regexes.fabricSubModEntry.lastIndex = 0;
          if (modMatch.groups.subtype) {
            const isSubSub = modMatch.groups.subtype == subSubMod;
            let parentMod: FabricModNonPartial;
            if (isSubSub) {
              const tempParentMod = mods[mods.length - 1];
              if (tempParentMod && "subMods" in tempParentMod)
                parentMod =
                  tempParentMod.subMods[tempParentMod.subMods.length - 1];
            } else parentMod = mods[mods.length - 1] as FabricModNonPartial;
            if (parentMod && "subMods" in parentMod)
              parentMod.subMods.push({
                modId: modMatch.groups.modid,
                version: modMatch.groups.version,
                subMods: [],
                partial: false,
              });
          } else if (!mods.find((i) => i.modId == modMatch.groups.modid))
            mods.push({
              modId: modMatch.groups.modid,
              version: modMatch.groups.version,
              subMods: [],
              partial: false,
            });
          nextMod = modsList.shift();
        }
      }
    } else if (
      loader == Loaders.FABRIC &&
      this.regexes.fabricCrashModsHeader.test(log)
    ) {
      this.regexes.fabricCrashModsHeader.lastIndex = 0;
      const fabricModsIndex = splitLog.findIndex((v) =>
        this.regexes.fabricCrashModsHeader.test(v)
      );
      const modsList = splitLog.slice(fabricModsIndex + 1); // start at mods list, while loop should stop at end
      let modMatch: RegExpExecArray;
      while (
        (modMatch = this.regexes.fabricCrashModEntry.exec(modsList.shift()))
      ) {
        this.regexes.fabricCrashModEntry.lastIndex = 0;
        if (!mods.find((i) => i.modId == modMatch.groups.modid))
          mods.push({
            modId: modMatch.groups.modid,
            version: modMatch.groups.version,
            subMods: [],
            partial: false,
          });
        let subModMatch: RegExpExecArray;
        while (
          (subModMatch = this.regexes.fabricCrashSubModEntry.exec(modsList[0]))
        ) {
          modsList.shift(); // only shift in here to ensure we don't remove non-sub mods
          this.regexes.fabricCrashSubModEntry.lastIndex = 0;
          const parentMod = mods[mods.length - 1];
          if (parentMod && "subMods" in parentMod)
            parentMod.subMods.push({
              modId: subModMatch.groups.modid,
              version: subModMatch.groups.version,
              subMods: [],
              partial: false,
            });
        }
      }
    }

    if (
      loader == Loaders.FORGE &&
      forgeDependenciesErrors.some((e) => log.includes(e))
    ) {
      const dependenciesErrorIndex = splitLog.findIndex((v) =>
        forgeDependenciesErrors.some((e) => v.endsWith(e))
      );
      const dependencyErrors = splitLog.slice(dependenciesErrorIndex + 1); // start with first item
      let depErrorMatch: RegExpExecArray;
      while (
        (depErrorMatch = this.regexes.forgeDependenciesError.exec(
          dependencyErrors.shift()
        ))
      ) {
        this.regexes.forgeDependenciesError.lastIndex = 0;
        const { dep, low, high, requiredby, actual } = depErrorMatch.groups;
        const mod = mods.find((i) => i.modId == requiredby);
        if (mod && "erroredDependencies" in mod)
          mod.erroredDependencies.push({
            name: dep,
            requiredVersion: high
              ? `${low}-${high}`
              : `${low} ${lang.get("MC_LOG_MISSING_DEP_OR_NEWER")}`,
            actual,
          });
        else
          mods.push({
            modId: requiredby,
            erroredDependencies: [
              {
                name: dep,
                requiredVersion: high
                  ? `${low}-${high}`
                  : `${low} ${lang.get("MC_LOG_MISSING_DEP_OR_NEWER")}`,
                actual,
              },
            ],
            partial: true,
          });
      }
    }

    // Split commit hash from version in Fabric crash reports
    if (
      mods.find(
        (i) =>
          i.modId == "essential" &&
          i.partial == false &&
          i.version.includes("+")
      )
    ) {
      const essential = mods.find(
        (i) => i.modId == "essential"
      ) as FabricEssentialMod;
      const [version, commit] = essential.version.split("+");
      essential.version = version;
      if (commit.startsWith("g")) essential.commit = commit.substring(1);
      else essential.branch = commit;
    }

    const essentialVersionMatch = this.regexes.essentialVersion.exec(log);
    this.regexes.essentialVersion.lastIndex = 0;
    if (essentialVersionMatch && validEssentialLoaders.includes(loader)) {
      const { version, commit, branch } = essentialVersionMatch.groups;
      if (
        !mods.find(
          (i) => i.modId == "essential" || i.modId == "essential-container"
        )
      )
        mods.push(
          loader == Loaders.FORGE || loader == Loaders.FEATHER_FORGE
            ? ({
                state: "Unknown",
                modId: "essential",
                version,
                commit,
                branch,
                source: `Essential (forge_${mcVersion}).jar`,
                erroredDependencies: [],
                partial: false,
              } as ForgeEssentialMod)
            : ({
                modId: "essential",
                version,
                commit,
                branch,
                partial: false,
              } as FabricEssentialMod)
        );
      else if (loader == Loaders.FORGE || loader == Loaders.FEATHER_FORGE) {
        // I don't think it'll actually ever appear as a mod on Forge
        // but if it does then this will add the extra info to it
        const essentialMod = mods.find(
          (i) => i.modId == "essential" || i.modId == "essential-container"
        ) as ForgeEssentialMod;
        essentialMod.version = version;
        essentialMod.commit = commit;
        essentialMod.branch = branch;
      } else if (loader == Loaders.FABRIC || loader == Loaders.FEATHER_FABRIC) {
        const essentialMod = mods.find(
          (i) => i.modId == "essential" || i.modId == "essential-container"
        ) as FabricEssentialMod;
        essentialMod.version = version;
        essentialMod.commit = commit;
        essentialMod.branch = branch;
      }
    }

    if (this.regexes.fullLogJavaVersion.test(log)) {
      this.regexes.fullLogJavaVersion.lastIndex = 0;
      const javaMatch = this.regexes.fullLogJavaVersion.exec(log);
      javaVersion = javaMatch?.groups?.version;
      javaVendor = javaMatch?.groups?.name;
    } else if (this.regexes.crashReportJavaVersion.test(log)) {
      this.regexes.crashReportJavaVersion.lastIndex = 0;
      const javaMatch = this.regexes.crashReportJavaVersion.exec(log);
      javaVersion = javaMatch?.groups?.version;
      javaVendor = javaMatch?.groups?.name;
    } else if (this.regexes.jvmCrashJavaVersion.test(log)) {
      this.regexes.jvmCrashJavaVersion.lastIndex = 0;
      const javaMatch = this.regexes.jvmCrashJavaVersion.exec(log);
      javaVersion = javaMatch?.groups?.version;
      javaVendor = javaMatch?.groups?.name;
    }
    this.regexes.fullLogJavaVersion.lastIndex = 0;
    this.regexes.crashReportJavaVersion.lastIndex = 0;
    this.regexes.jvmCrashJavaVersion.lastIndex = 0;

    return {
      logType,
      loader,
      mcVersion,
      loaderVersion,
      optifineVersion,
      featherVersion,
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

    const logLower = log.toLowerCase();

    if (
      (versions.loader == Loaders.FEATHER_FORGE ||
        versions.loader == Loaders.FEATHER_FABRIC ||
        versions.mods.find((m) => m.modId == "feather")) &&
      user instanceof FireMember &&
      user.guild.settings.get<boolean>("minecraft.logscan.clients", false) &&
      !user.guild.settings.get<boolean>("minecraft.logscan.allowfeather", false)
    ) {
      if (!user.hasExperiment(2219986954, 1))
        // i need better ways of detecting feather
        // so I need more log samples
        this.client.writeToInflux([
          {
            measurement: "mclogs",
            tags: {
              type: "feather",
              user_id: user.id,
              cluster: this.client.manager.id.toString(),
              shard:
                user instanceof FireMember
                  ? user.guild.shardId.toString()
                  : "0",
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
      return language.get("MC_LOG_FEATHER_CLIENT");
    }

    if (
      clientDetection.lunar.some((l) => logLower.includes(l)) &&
      user instanceof FireMember &&
      user.guild.settings.get<boolean>("minecraft.logscan.clients", false)
    ) {
      if (!user.hasExperiment(2219986954, 1))
        // same reason as feather
        this.client.writeToInflux([
          {
            measurement: "mclogs",
            tags: {
              type: "lunar",
              user_id: user.id,
              cluster: this.client.manager.id.toString(),
              shard:
                user instanceof FireMember
                  ? user.guild.shardId.toString()
                  : "0",
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
      return language.get("MC_LOG_LUNAR_CLIENT");
    }

    if (
      clientDetection.badlion.some((l) => logLower.includes(l)) &&
      user instanceof FireMember &&
      user.guild.settings.get<boolean>("minecraft.logscan.clients", false)
    ) {
      // same again
      this.client.writeToInflux([
        {
          measurement: "mclogs",
          tags: {
            type: "badlion",
            user_id: user.id,
            cluster: this.client.manager.id.toString(),
            shard:
              user instanceof FireMember ? user.guild.shardId.toString() : "0",
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
      return language.get("MC_LOG_BADLION_CLIENT");
    }

    if (
      logLower.includes("net.kdt.pojavlaunch") &&
      user instanceof FireMember &&
      user.guild.settings.get("minecraft.logscan.mobile", false)
    )
      return language.get("MC_LOG_MOBILE_UNSUPPORTED");

    if (
      this.bgs.cheats.some((cheat) => logLower.includes(cheat.toLowerCase())) &&
      user instanceof FireMember &&
      user.guild.settings.get("minecraft.logscan.cheats", false)
    ) {
      const found = this.bgs.cheats.filter((cheat) =>
        logLower.includes(cheat.toLowerCase())
      );
      // user has not opted out of data collection for analytics
      if (!user.hasExperiment(2219986954, 1))
        this.client.writeToInflux([
          {
            measurement: "mclogs",
            tags: {
              type: "cheats",
              user_id: user.id,
              cluster: this.client.manager.id.toString(),
              shard:
                user instanceof FireMember
                  ? user.guild.shardId.toString()
                  : "0",
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
      return language.get("MC_LOG_CHEATS_FOUND");
    }

    let currentSolutions = new Set<string>();
    let currentRecommendations = new Set<string>();

    if (
      (versions.mcVersion == "1.8.9" || versions.mcVersion == "1.12.2") &&
      versions.mods.find((m) => m.modId == "patcher") &&
      log.includes("AMD Radeon")
    )
      currentSolutions.add(patcherAMDIssue.hasPatcherAndAMD);
    else if (
      (versions.mcVersion == "1.8.9" || versions.mcVersion == "1.12.2") &&
      versions.mods.find((m) => m.modId == "patcher") &&
      log.includes("exit code -805306369")
    )
      currentSolutions.add(patcherAMDIssue.hasPatcherGPUUnknown);
    else if (
      (versions.mcVersion == "1.8.9" || versions.mcVersion == "1.12.2") &&
      log.includes("AMD Radeon")
    )
      currentSolutions.add(patcherAMDIssue.noPatcherAndAMD);
    else if (
      (versions.mcVersion == "1.8.9" || versions.mcVersion == "1.12.2") &&
      log.includes("exit code -805306369")
    )
      currentSolutions.add(patcherAMDIssue.noPatcherGPUUnknown);

    if (versions.mcVersion in this.bgs.versions)
      for (const [err, sol] of Object.entries(
        this.bgs.versions[versions.mcVersion].solutions ?? {}
      )) {
        if (logLower.includes(err.toLowerCase()))
          currentSolutions.add(`- **${sol}**`);
      }

    for (const [err, sol] of Object.entries(this.bgs.solutions)) {
      if (logLower.includes(err.toLowerCase()))
        currentSolutions.add(`- **${sol}**`);
    }

    if (versions?.loader == Loaders.FABRIC) {
      if (versions?.optifineVersion)
        currentSolutions.add(
          `- **Fabric is not supported by OptiFine. It is recommended to use the (way better) alternatives from this list \n<https://lambdaurora.dev/optifine_alternatives>**`
        );
      const loaderDataReq = await centra(
        `https://meta.fabricmc.net/v1/versions/loader/${versions.mcVersion}`
      )
        .header("User-Agent", this.client.manager.ua)
        .send();
      const loaderData = await loaderDataReq
        .json()
        .then((data: FabricLoaderVersion[]) =>
          data.filter((v) => v.loader.stable)
        )
        .catch(() => [] as FabricLoaderVersion[]);
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
      let validVersion = false;
      // forge decided to be dumb and change the file name format for some 1.8.9 versions so we don't bother with checking if on 1.8.9
      if (versions.mcVersion != "1.8.9") {
        const isValidVersionReq = await centra(
          `https://maven.minecraftforge.net/net/minecraftforge/forge/${versions.mcVersion}-${versions.loaderVersion}/forge-${versions.mcVersion}-${versions.loaderVersion}-changelog.txt`
        )
          .send()
          .catch(() => ({ statusCode: 500 }));
        validVersion = isValidVersionReq.statusCode == 200;
      } else validVersion = true;
      if (validVersion) {
        const dataReq = await centra(
          "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json"
        )
          .header("User-Agent", this.client.manager.ua)
          .send()
          .catch(() => ({ json: async () => ({ homepage: "", promos: {} }) }));
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
      } else versions.loaderVersion = "Unknown";

      if (versions.optifineVersion && versions.loader == Loaders.FORGE) {
        let optifineVersions =
          this.client.manager.state.optifineVersions?.[versions.mcVersion];
        const current = optifineVersions?.find(
          (v) => v.shortName == versions.optifineVersion
        );
        if (optifineVersions?.length && current)
          optifineVersions = optifineVersions.filter((v) => {
            // idek how current.forgeVersion can be false if versions.loader == Loaders.FORGE
            // but FIRE-8PS exists so it's possible.... somehow
            if (!v.forgeVersion || !current.forgeVersion) return false;
            const [loaderMajor, loaderMinor] = versions.loaderVersion
              .split(".")
              .slice(-2)
              .map(Number);
            const [currentMajor, currentMinor] = current.forgeVersion
              .split(".")
              .slice(-2)
              .map(Number);

            const isPreRelease = v.shortName.includes("pre");
            const majorDiff = loaderMajor - currentMajor;
            const minorDiff = loaderMinor - currentMinor;

            if (isPreRelease) {
              if (versions.optifineVersion.includes("pre")) {
                return v.forgeVersion <= versions.loaderVersion;
              } else {
                return (
                  (majorDiff >= 1 || minorDiff >= 10) &&
                  v.forgeVersion > current.forgeVersion
                );
              }
            } else {
              return v.forgeVersion <= versions.loaderVersion;
            }
          });

        if (
          optifineVersions[0] &&
          optifineVersions[0].shortName != versions.optifineVersion
        )
          currentSolutions.add(
            "- **" +
              language.get("MC_LOG_UPDATE", {
                item: "OptiFine",
                current: versions.optifineVersion,
                latest: optifineVersions[0].shortName,
              }) +
              "**"
          );
      }
    } else if (versions?.loader == Loaders.OPTIFINE) {
      let optifineVersions =
        this.client.manager.state.optifineVersions?.[versions.mcVersion];
      if (optifineVersions.length) {
        optifineVersions = optifineVersions.filter((v) => {
          if (
            v.shortName.includes("pre") &&
            !versions.optifineVersion.includes("pre")
          )
            return false;
        });
        if (
          optifineVersions[0] &&
          optifineVersions[0].shortName != versions.optifineVersion
        )
          currentSolutions.add(
            "- **" +
              language.get("MC_LOG_UPDATE", {
                item: "OptiFine",
                current: versions.loaderVersion,
                latest: optifineVersions[0].shortName,
              }) +
              "**"
          );
      }
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
      const isGB = allocatedRam?.[0].endsWith("G");
      if (
        allocatedRam &&
        parseInt(allocatedRam?.groups?.ram) > (isGB ? 4 : 4096)
      )
        currentRecommendations.add(
          `- Most of the time you don't need more than 2GB RAM allocated (maybe 3-4GB if you use skyblock mods). You may be able to reduce the amount of RAM allocated from ${
            allocatedRam.groups.ram
          } to ${isGB ? "2G" : "2048M"} or ${isGB ? "3G" : "3072M"}`
        );
    }

    if (versions.mcVersion in this.bgs.versions)
      for (const [err, sol] of Object.entries(
        this.bgs.versions[versions.mcVersion].recommendations ?? {}
      )) {
        if (logLower.includes(err.toLowerCase()))
          currentRecommendations.add(`- ${sol}`);
      }

    for (const [rec, sol] of Object.entries(this.bgs.recommendations)) {
      if (
        logLower.includes(rec.toLowerCase()) &&
        !currentSolutions.has(`- **${sol}**`)
      )
        currentRecommendations.add(`- ${sol}`);
    }

    if (versions.mods.length)
      for (const mod of versions.mods) {
        if (
          (mod.modId == "essential" || mod.modId == "essential-container") &&
          mod.partial == false &&
          mod.version == "1.0.0"
        )
          continue;
        const mainModId = this.getMainModId(mod.modId);
        if (mainModId in this.modVersions && mod.partial == false) {
          let latest =
            this.modVersions[mainModId]?.versions[versions.mcVersion]?.[
              versions.loader as ModLoaders
            ];
          if (mod.version == latest || !latest) continue;
          if (this.regexes.majorMinorOnly.test(latest)) latest = `${latest}.0`;
          const isSemVer = this.regexes.semver.test(mod.version);
          this.regexes.majorMinorOnly.lastIndex = 0;
          this.regexes.semver.lastIndex = 0;
          // the version in this.modVersions should (in theory) always be the latest
          let isOutdated = mod.version != latest;
          // but we'll check semver just in case it's a version that's not yet released
          // or we haven't fetched since the latest update
          if (isSemVer)
            try {
              isOutdated = semverLessThan(mod.version, latest);
            } catch (e) {
              if (
                e instanceof TypeError &&
                e.message.includes("Invalid Version")
              ) {
                this.client.sentry.captureException(e, {
                  extra: {
                    mod: mod.modId,
                    current: mod.version,
                    latest,
                  },
                });
              }
            }
          if (isOutdated)
            currentRecommendations.add(
              "- " +
                language.get("MC_LOG_UPDATE", {
                  item: titleCase(mod.modId.replace(modIdClean, " ")).replace(
                    "Api", // makes fabric api look nicer
                    "API"
                  ),
                  current: mod.version,
                  latest,
                })
            );
        }
        if ("erroredDependencies" in mod && mod.erroredDependencies.length) {
          for (const dep of mod.erroredDependencies) {
            const isMissing = dep.actual == missingDep;
            currentSolutions.add(
              "- **" +
                language.get(
                  isMissing ? "MC_LOG_MISSING_DEP" : "MC_LOG_MISMATCHED_DEP",
                  {
                    mod: mod.modId,
                    ...dep,
                  }
                ) +
                "**"
            );
          }
        }
      }

    if (versions.mods.find((m) => m.modId == "skytils")) {
      const skytils = versions.mods.find((m) => m.modId == "skytils");
      if (
        skytils.partial == false &&
        (semverGreaterThan(skytils.version, "1.10.0-pre8") ||
          semverGreaterThan(skytils.version, "1.9.7"))
      ) {
        const essential = versions.mods.find(
          (m) => m.modId == "essential" || m.modId == "essential-container"
        );
        if (
          essential &&
          essential.partial == false &&
          semverLessThan(essentialVersionToSemver(essential.version), "1.3.2-6")
        )
          currentSolutions.add(
            "- **You'll need to update Essential to the latest version. The game should prompt you to update before the crash occurs but if not," +
              " you can download the latest version from " +
              "[the Essential website](<https://essential.gg/downloads>) or [Modrinth](<https://modrinth.com/mod/essential>)**"
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
      ? `## ${language.get("MC_LOG_POSSIBLE_SOLUTIONS")}:\n${[
          ...currentSolutions,
        ]
          .map((s) => s.replace("\n", "**\n**"))
          .join("\n")}`
      : "";
    const recommendations = currentRecommendations.size
      ? `${currentSolutions.size ? "\n\n" : ""}${language.get(
          "MC_LOG_RECOMMENDATIONS"
        )}:\n${[...currentRecommendations].join("\n")}`
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
        await message.delete({
          reason: message.guild.language.get(
            "MC_LOG_NO_REUPLOAD_DELETE_REASON"
          ),
        });
      } catch {}
      return await message.channel.send({
        content: message.language.get("MC_LOG_NO_REUPLOAD", {
          user: message.author.toMention(),
        }) as string,
        allowedMentions: { users: [message.author.id] },
      });
    } else this.regexes.noRaw.lastIndex = 0;

    const pasteURLs: URL[] = [];
    if (validPasteURLs.some((u) => message.content.includes(u))) {
      const matches = message.content.match(regexes.basicURL);
      for (const match of matches) {
        // should disregard suppressed links, ending > should be included in match
        if (message.content.includes(`<${match}`)) continue;

        const rawURL = this.client.util.getRawPasteURL(match);
        if (rawURL) {
          if (
            rawURL.pathname.endsWith(".log") ||
            rawURL.pathname.endsWith(".txt")
          )
            rawURL.pathname = rawURL.pathname.slice(0, -4);
          pasteURLs.push(rawURL);
          message.content = message.content.replace(match, "");
        }
      }
    }

    for (const paste of pasteURLs)
      message.attachments.set(
        paste.pathname,
        new MessageAttachment(
          paste.toString(),
          `${paste.hostname}${paste.pathname}.txt`,
          {
            id: paste.pathname,
            filename: `${paste.hostname}${paste.pathname}.txt`,
            size: 0,
            proxy_url: paste.toString(),
            url: paste.toString(),
          }
        )
      );

    if (!message.attachments.size && message.content.length > 350) {
      const processed = await this.processLogStream(message, message.content);
      if (processed && this.hasLogText(processed))
        return await this.handleLogText(message, "content", processed, "sent");
    }

    for (const [, attach] of message.attachments.filter(
      (attachment) =>
        (attachment.name.endsWith(".log") ||
          attachment.name.endsWith(".txt")) &&
        attachment.size <= 8000000
    )) {
      try {
        let chunks: string[] = [];
        const stream = await this.client.util.getPasteContent(
          new URL(attach.url),
          true
        );
        if (!stream) continue;
        for await (const chunk of stream) {
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
          await this.handleLogText(
            message,
            attach.url,
            processed.join(""),
            "uploaded"
          );
      } catch (e) {
        this.client.console.debug(`[MCLogs] Failed to process log,`, e.stack);
        this.client.sentry.captureException(e);
        await message.send("MC_LOG_READ_FAIL");
      }
    }
  }

  private async processLogStream(message: FireMessage, data: string) {
    data = data
      .replace(this.regexes.email, "[removed email]")
      .replace(this.regexes.home, "USER.HOME");

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

  async handleLogText(
    message: FireMessage,
    source: string,
    text: string,
    msgType: string
  ) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (this.regexes.secrets.test(line)) {
        this.regexes.secrets.lastIndex = 0;
        text = text.replace(line, "[line removed to protect sensitive info]");
      }
      if (this.regexes.multiMcDisabled.test(line)) {
        this.regexes.multiMcDisabled.lastIndex = 0;
        text = text.replace(
          line,
          "[disabled mod removed to prevent non-applicable solutions]"
        );
      }
      this.regexes.multiMcDisabled.lastIndex = 0;
      this.regexes.secrets.lastIndex = 0;
    }

    text = text.replace(this.regexes.secrets, "[secrets removed]");

    const mcInfo = this.getMCInfo(
      text,
      lines,
      message.guild ? message.guild.language : this.client.getLanguage("en-US")
    );
    let modsHaste: string;
    if (mcInfo.mods.length)
      await this.client.util
        .haste(JSON.stringify(mcInfo.mods, null, 2), true, "json", true)
        .then((haste) => (modsHaste = haste.raw))
        .catch(() => {});

    try {
      const haste = await this.client.util
        .haste(text, false, "", true)
        .catch((e: Error) => e);
      if (haste instanceof Error)
        return await message.error("MC_LOG_FAILED", { error: haste.message });
      // user has not opted out of data collection for analytics
      else if (!message.hasExperiment(2219986954, 1))
        this.client.writeToInflux([
          {
            measurement: "mclogs",
            tags: {
              type: "upload",
              user_id: message.author.id,
              cluster: this.client.manager.id.toString(),
              shard: message.shard.id.toString(),
            },
            fields: {
              guild: message.guild
                ? `${message.guild?.name} (${message.guildId})`
                : message.channel.type == "DM"
                ? "DM"
                : "Unknown",
              user: `${message.author} (${message.author.id})`,
              haste: haste.url,
              log_type: mcInfo.logType,
              loader: mcInfo?.loader,
              loader_version: mcInfo?.loaderVersion,
              mc_version: mcInfo?.mcVersion,
              raw: haste.raw,
              mods: modsHaste,
              source,
            },
          },
        ]);
      message.delete().catch(() => {});

      let possibleSolutions: string,
        ign: string,
        loggedUUID: string,
        loggedUUIDVersion: string,
        loggedUUIDInvalid = false,
        cracked = false;
      const essentialAuth = this.regexes.essentialAuth.exec(text);
      this.regexes.essentialAuth.lastIndex = 0;
      if (essentialAuth) {
        ign = essentialAuth.groups?.ign;
        loggedUUID = essentialAuth.groups?.uuid;
        loggedUUIDVersion = essentialAuth.groups?.ver;
      } else {
        const settingUser = this.regexes.settingUser.exec(text);
        this.regexes.settingUser.lastIndex = 0;
        ign = settingUser?.[1] ?? settingUser?.[2];
        const uuidArg = this.regexes.uuidArg.exec(text);
        this.regexes.uuidArg.lastIndex = 0;
        loggedUUID = uuidArg?.groups?.uuid;
        loggedUUIDVersion = uuidArg?.groups?.ver;
        if (uuidArg?.groups?.invalid) loggedUUIDInvalid = true;
      }
      const isDevEnv =
        this.regexes.devEnvUser.test(ign) && text.includes("GradleStart");
      this.regexes.devEnvUser.lastIndex = 0;
      if (ign && !isDevEnv) {
        try {
          const profile = await this.client.util
            .mcProfile(ign)
            .catch((e: MojangAPIError) => e);
          if (
            message.guild.settings.get<boolean>(
              "minecraft.logscan.cracked",
              false
            ) &&
            (profile instanceof ProfileNotFoundError ||
              (loggedUUIDVersion && loggedUUIDVersion != "4") ||
              loggedUUIDInvalid ||
              (!(profile instanceof Error) &&
                loggedUUID &&
                (loggedUUID.includes("-") ? profile.idDashed : profile.id) !=
                  loggedUUID))
          ) {
            cracked = true;
            // user has not opted out of data collection for analytics
            if (!message.hasExperiment(2219986954, 1))
              this.client.writeToInflux([
                {
                  measurement: "mclogs",
                  tags: {
                    type: "cracked",
                    user_id: message.author.id,
                    cluster: this.client.manager.id.toString(),
                    shard: message.shard.id.toString(),
                  },
                  fields: {
                    guild: message.guild
                      ? `${message.guild?.name} (${message.guildId})`
                      : message.channel.type == "DM"
                      ? "DM"
                      : "Unknown",
                    user: `${message.author} (${message.author.id})`,
                    ign,
                    loggedUUID: loggedUUID || "Unknown",
                    haste: haste.url,
                    raw: haste.raw,
                    status:
                      profile instanceof Error
                        ? profile.message
                        : "Mismatched UUID",
                  },
                },
              ]);
            possibleSolutions =
              "\n" + message.guild.language.get("MC_LOG_CRACKED");
          } else if (!(profile instanceof MojangAPIError)) {
            possibleSolutions = await this.getSolutions(
              message.member ?? message.author,
              mcInfo,
              haste,
              text
            );
            if (!message.hasExperiment(2219986954, 1))
              // user has not opted out of data collection for analytics
              this.client.writeToInflux([
                {
                  measurement: "mclogs",
                  tags: {
                    type: "user",
                    user_id: message.author.id,
                    cluster: this.client.manager.id.toString(),
                    shard: message.shard.id.toString(),
                  },
                  fields: {
                    guild: message.guild
                      ? `${message.guild?.name} (${message.guildId})`
                      : message.channel.type == "DM"
                      ? "DM"
                      : "Unknown",
                    user: `${message.author} (${message.author.id})`,
                    ign: profile.name,
                    uuid: profile.id,
                    uuidDashed: profile.idDashed,
                    haste: haste.url,
                    raw: haste.raw,
                  },
                },
              ]);
          }
        } catch (e) {
          this.client.console.error(
            `[MCLogs] Failed to get Mojang profile for ${ign}\n${e.stack}`
          );
          this.client.sentry.captureException(e);
        }
      } else
        possibleSolutions = await this.getSolutions(
          message.member ?? message.author,
          mcInfo,
          haste,
          text
        );

      const allowedMentions = { users: [message.author.id] };
      const components = [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("LINK")
            .setURL(haste.url ?? "https://google.com/something_broke_lol")
            .setLabel(
              message.language.get(
                `MC_LOG_VIEW_${mcInfo.logType}` as LanguageKeys
              )
            ),
          new MessageButton()
            .setStyle("LINK")
            .setURL(haste.raw ?? "https://google.com/something_broke_lol")
            .setLabel(
              message.language.get(
                `MC_LOG_VIEW_${mcInfo.logType}_RAW` as LanguageKeys
              )
            ),
          new MessageButton()
            .setStyle("PRIMARY")
            .setCustomId("!mclogscan:solution")
            .setLabel(message.language.get("MC_LOG_REPORT_SOLUTION"))
            .setDisabled(cracked),
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
          (message.guild ?? message).language.get(
            mcInfo.mods.length
              ? "MC_LOG_LOADER_INFO_WITH_MODS"
              : "MC_LOG_LOADER_INFO",
            {
              version: mcInfo.loaderVersion?.trim(),
              minecraft: mcInfo.mcVersion?.trim(),
              loader:
                (mcInfo.loader == Loaders.FEATHER_FORGE ||
                  mcInfo.loader == Loaders.FEATHER_FABRIC) &&
                mcInfo.featherVersion
                  ? `${mcInfo.loader.slice(0, 7)} ${
                      mcInfo.featherVersion
                    } ${mcInfo.loader.slice(8)}`
                  : mcInfo.loader?.trim(),
              mods: mcInfo.mods.length,
            }
          )
        );
      if (mcInfo.optifineVersion && mcInfo.loader != Loaders.OPTIFINE)
        details.push(
          (message.guild ?? message).language.get("MC_LOG_OPTIFINE_INFO", {
            version: mcInfo.optifineVersion,
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
      this.client.sentry.captureException(e);
    }
  }

  hasLogText(text: string) {
    return this.logText.some((logText) => {
      // this.client.console.debug(
      //   `[MCLogs] Does ${text} include ${logText}? ${text.includes(logText)}`
      // );
      return text.includes(logText);
    });
  }
}
