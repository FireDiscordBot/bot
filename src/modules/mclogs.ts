import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { validPasteURLs } from "@fire/lib/util/clientutil";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  DiscordAPIError,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Util,
} from "discord.js";
import { getCodeblockMatch } from "../arguments/codeblock";

const { regexes } = constants;

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
  NEOFORGE = "NeoForge",
  FABRIC = "Fabric",
  QUILT = "Quilt",
  OPTIFINE = "Vanilla w/OptiFine HD U", // will be shown as "Vanilla w/OptiFine HD U H4"
  FEATHER_FORGE = "Feather with Forge", // Feather's version will be inserted before displaying
  FEATHER_FABRIC = "Feather with Fabric", // same here
}
type ModLoaders = "Forge" | "NeoForge" | "Fabric" | "Quilt";

// this is a mess now thanks to Mojang switching version scheme
// and makes some assumptions about the future versioning
// such as that pre and rc will follow the same {version}-{type}-{number} format
// that snapshots will be, (i.e. 26.1-snapshot-1), e.g. 26.1-rc-1
export type MinecraftVersion =
  | `${number}.${number}.${number}` // e.g. 1.21.11 or 26.1.1
  | `${number}.${number}.${number}-snapshot-${number}` // e.g. 26.1.1-snapshot-1
  | `${number}.${number}.${number}-pre-${number}` // e.g. 26.1.1-pre-1
  | `${number}.${number}.${number}-pre${number}` // e.g. 1.21.11-pre4
  | `${number}.${number}.${number}-rc-${number}` // e.g. 26.1.1-rc-1
  | `${number}.${number}.${number}-rc${number}` // e.g. 1.21.11-rc1
  | `${number}.${number}` // e.g. 1.21 or 26.1
  | `${number}.${number}-snapshot-${number}` // e.g. 26.1-snapshot-1
  | `${number}.${number}-pre-${number}` // e.g. 26.1-pre-1
  | `${number}.${number}-pre${number}` // e.g. 1.21-pre4
  | `${number}.${number}-rc-${number}` // e.g. 26.1-rc-1
  | `${number}.${number}-rc${number}` // e.g. 1.21-rc1
  | `${number}w${number}${string}`; // e.g. 25w04a or 25w14craftmine
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

type ForgeClassicModStateChars =
  | "U"
  | "L"
  | "C"
  | "H"
  | "I"
  | "J"
  | "A"
  | "D"
  | "E";
type ForgeClassicModState =
  `${ForgeClassicModStateChars}${ForgeClassicModStateChars}*`;
type ForgeModState =
  | "Unknown"
  | ForgeClassicModState
  | "ERROR"
  | "VALIDATE"
  | "CONSTRUCT"
  | "COMMON_SETUP"
  | "SIDED_SETUP"
  | "ENQUEUE_IMC"
  | "PROCESS_IMC"
  | "COMPLETE"
  | "DONE";
type ForgeModNonPartial = {
  state: ForgeModState;
  modId: string;
  name?: string; // not always included
  version: string;
  source: ModSource;
  erroredDependencies: DependencyInfo[];
  partial: false;
};
type ForgeEssentialMod = {
  state: string;
  modId: "essential" | "essential-container";
  name: "Essential";
  commit: string;
  branch: string;
  version: string;
  source: ModSource;
  erroredDependencies: DependencyInfo[];
  partial: false;
};
type NeoForgeMod = {
  name: string;
  modId: string;
  version: string;
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
  | NeoForgeMod
  | PartialMod
  | FabricModNonPartial
  | FabricEssentialMod;
type DependencyInfo = {
  name: string;
  requiredVersion: string;
  actual: string;
};
type DupedModsData = {
  modId: string;
  sources: ModSource[];
};
type ModSource = `${string}.jar`;

type MCLogsResponse =
  | { error: string }
  | {
      logType: LogType;
      client: {
        loader: Loaders | undefined;
        mcVersion: MinecraftVersion | undefined;
        loaderVersion: string | undefined;
        optifineVersion: string | undefined;
        featherVersion: string | undefined;
        javaVersion: string | undefined;
        jvmType: string | undefined;
        jvmArguments: string[];
        mods: ModInfo[];
        duplicateMods: DupedModsData[];
      };
      analysis: {
        solutions: string[];
        recommendations: string[];
        unsupported: boolean;
      };
      profile: {
        ign?: string;
        uuid?: string;
      };
      paste: string | null;
    };

const builtInMods = [
  "FML",
  "mcp",
  "Forge",
  "neoforge",
  "minecraft",
  "java",
  "fabricloader",
];

export default class MCLogs extends Module {
  constructor() {
    super("mclogs");
  }

  private canUse(guild?: FireGuild, user?: FireUser) {
    if (guild)
      return (
        guild.hasExperiment(77266757, [1, 2]) ||
        (guild.premium && guild.settings.get("minecraft.logscan", false))
      );
    else if (user) return user.isSuperuser() || user.premium;
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

    const language = (message.guild ?? message).language;

    const codeblock = getCodeblockMatch(message.content);
    if (codeblock && codeblock.language) return; // likely not a log

    const pasteURLs: { match: string; rawURL: URL }[] = [];
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
          pasteURLs.push({ match, rawURL });
        }
      }
    } else if (
      message.attachments.size &&
      message.attachments.some(
        (attach) => attach.name.endsWith(".log") || attach.name.endsWith(".txt")
      )
    ) {
      const potentialLogs = message.attachments.filter(
        (attach) => attach.name.endsWith(".log") || attach.name.endsWith(".txt")
      );
      for (const potential of potentialLogs.values())
        pasteURLs.push({
          match: potential.url,
          rawURL: new URL(potential.url),
        });
    }

    for (const { match, rawURL } of pasteURLs) {
      const longProcessingTimeout = setTimeout(() => {
        message.react(this.client.util.useEmoji("MINECRAFT_LOADING"));
      }, 2500);
      const mclogsReq = await centra(`${constants.url.mclogs}/scan`, "post")
        .header("User-Agent", this.client.manager.ua)
        .header("Authorization", `Bearer ${process.env.MCLOGS_API_KEY}`)
        .body(
          {
            url: rawURL.toString(),
            paste: true,
            config: {
              mobile: message.guild?.settings.get(
                "minecraft.logscan.mobile",
                false
              ),
              clients: message.guild?.settings.get(
                "minecraft.logscan.clients",
                false
              ),
              cheats: message.guild?.settings.get(
                "minecraft.logscan.cheats",
                false
              ),
              allowFeather: message.guild?.settings.get(
                "minecraft.logscan.allowfeather",
                false
              ),
              cracked: message.guild?.settings.get(
                "minecraft.logscan.cracked",
                false
              ),
              filters: {
                sensitive: true,
                email: true,
                name: false,
                ip: false,
              },
            },
          },
          "json"
        )
        .send();
      clearTimeout(longProcessingTimeout);
      if (mclogsReq.statusCode == 204) continue;
      const mclogsRes = (await mclogsReq
        .json()
        .catch(() => ({ error: "Failed to parse body" }))) as MCLogsResponse;
      if ("error" in mclogsRes) {
        const e = new Error(mclogsRes.error);
        this.console.debug("Failed to process log\n", e.stack);
        this.client.sentry.captureException(e);
      } else if ("logType" in mclogsRes) {
        try {
          await this.handleLogRes(
            message,
            language,
            pasteURLs,
            match,
            rawURL,
            mclogsRes
          );
        } catch (e) {
          this.console.error(`Failed to send log message\n${e.stack}`);
          if (!(e instanceof DiscordAPIError))
            this.client.sentry.captureException(e);
        }
      }
    }
  }

  private async handleLogRes(
    message: FireMessage,
    language: Language,
    pasteURLs: { match: string; rawURL: URL }[],
    match: string,
    rawURL: URL,
    mclogsRes: MCLogsResponse
  ) {
    if ("error" in mclogsRes) return;
    const haste = mclogsRes.paste ? new URL(mclogsRes.paste) : null;
    let hasteRaw: URL;
    if (haste) {
      hasteRaw = new URL(mclogsRes.paste);
      hasteRaw.pathname = `/raw${hasteRaw.pathname}`;
    }
    if (!message.hasExperiment(2219986954, 1))
      this.client.manager.writeToInflux([
        {
          measurement: "mclogs",
          tags: {
            type: "upload",
            user_id: message.author.id,
            cluster: this.client.manager.id.toString(),
            shard: message.shard.toString(),
          },
          fields: {
            guild: message.guild
              ? `${message.guild?.name} (${message.guildId})`
              : message.channel.type == "DM"
                ? "DM"
                : "Unknown",
            user: `${message.author} (${message.author.id})`,
            haste: haste ? haste.toString() : "",
            log_type: mclogsRes.logType ?? "",
            loader: mclogsRes.client.loader ?? "",
            loader_version: mclogsRes.client.loaderVersion ?? "",
            mc_version: mclogsRes.client.mcVersion ?? "",
            raw: hasteRaw ? hasteRaw.toString() : "",
            source: match,
          },
        },
      ]);

    if (haste) message.delete().catch(() => {});
    else if (
      message.guild?.members.me
        .permissionsIn(message.channelId)
        .has(PermissionFlagsBits.ManageMessages)
    )
      message.reactions.removeAll().catch(() => {});

    const allowedMentions = { users: [message.author.id] };
    const components = [
      new MessageActionRow().addComponents([
        new MessageButton()
          .setStyle("LINK")
          .setURL(
            haste ? haste.toString() : "https://google.com/something_broke_lol"
          )
          .setLabel(language.get(`MC_LOG_VIEW_${mclogsRes.logType}`))
          .setDisabled(!haste),
        new MessageButton()
          .setStyle("LINK")
          .setURL(
            hasteRaw
              ? hasteRaw.toString()
              : "https://google.com/something_broke_lol"
          )
          .setLabel(language.get(`MC_LOG_VIEW_${mclogsRes.logType}_RAW`))
          .setDisabled(!hasteRaw),
        new MessageButton()
          .setStyle("PRIMARY")
          .setCustomId("!mclogscan:solution")
          .setLabel(language.get("MC_LOG_REPORT_SOLUTION"))
          .setDisabled(mclogsRes.analysis.unsupported),
      ]),
    ];

    const details = [];
    if (mclogsRes.client.javaVersion)
      details.push(
        language.get("MC_LOG_JVM_INFO", {
          type: mclogsRes.client.jvmType.trim() ?? "Unknown JVM type",
          version: mclogsRes.client.javaVersion.trim(),
        })
      );
    if (mclogsRes.client.loader)
      details.push(
        language.get(
          mclogsRes.client.mods.length &&
            // we don't want to show a mod count if
            // essential is the only known mod
            // as that is detected separately
            !(
              mclogsRes.client.mods.length == 1 &&
              mclogsRes.client.mods[0].modId.includes("essential")
            )
            ? "MC_LOG_LOADER_INFO_WITH_MODS"
            : "MC_LOG_LOADER_INFO",
          {
            version: mclogsRes.client.loaderVersion?.trim(),
            minecraft: mclogsRes.client.mcVersion?.trim(),
            loader:
              (mclogsRes.client.loader == Loaders.FEATHER_FORGE ||
                mclogsRes.client.loader == Loaders.FEATHER_FABRIC) &&
              mclogsRes.client.featherVersion
                ? `${mclogsRes.client.loader.slice(0, 7)} ${
                    mclogsRes.client.featherVersion
                  } ${mclogsRes.client.loader.slice(8)}`
                : mclogsRes.client.loader?.trim(),
            mods: mclogsRes.client.mods.filter(
              (m) => !builtInMods.includes(m.modId)
            ).length,
          }
        )
      );
    if (
      mclogsRes.client.optifineVersion &&
      mclogsRes.client.loader != Loaders.OPTIFINE
    )
      details.push(
        language.get("MC_LOG_OPTIFINE_INFO", {
          version: mclogsRes.client.optifineVersion,
        })
      );

    const solutions =
      mclogsRes.analysis.solutions.length && !mclogsRes.analysis.unsupported
        ? `## ${message.guild.language.get("MC_LOG_POSSIBLE_SOLUTIONS")}:\n${mclogsRes.analysis.solutions
            .map((s) => `- **${s}**`)
            .join("\n")}`
        : "";
    const recommendations =
      mclogsRes.analysis.recommendations.length &&
      !mclogsRes.analysis.unsupported
        ? `${mclogsRes.analysis.solutions.length ? "\n\n" : ""}${message.guild.language.get(
            "MC_LOG_RECOMMENDATIONS"
          )}:\n${mclogsRes.analysis.recommendations.map((r) => `- ${r}`).join("\n")}`
        : "";

    let content = message.content;
    for (const { match } of pasteURLs)
      if (content.includes(match)) content = content.replaceAll(match, "");

    const logHaste = language
      .get(mclogsRes.profile.ign ? "MC_LOG_HASTE_WITH_IGN" : "MC_LOG_HASTE", {
        extra: rawURL.host.includes("discordapp") ? content : "",
        details: details.map((d) => `- ${d}`).join("\n"),
        user: message.author.toMention(),
        solutions: mclogsRes.analysis.unsupported
          ? "\n" +
            (mclogsRes.analysis.solutions[0] ?? "Unable to provide solutions")
          : solutions + recommendations,
        ign: mclogsRes.profile.ign
          ? Util.escapeMarkdown(mclogsRes.profile.ign)
          : undefined,
        msgType: rawURL.host.includes("discordapp") ? "uploaded" : "sent",
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
          content: language.get(
            mclogsRes.client.loader
              ? mclogsRes.profile.ign
                ? "MC_LOG_HASTE_WITH_LOADER_AND_IGN"
                : "MC_LOG_HASTE_WITH_LOADER"
              : mclogsRes.profile.ign
                ? "MC_LOG_HASTE_WITH_IGN"
                : "MC_LOG_HASTE",
            {
              extra: rawURL.host.includes("discordapp") ? content : "",
              solutions: language.get("MC_LOG_WTF"),
              user: message.author.toMention(),
              version: mclogsRes.client.loaderVersion,
              minecraft: mclogsRes.client.mcVersion,
              loader: mclogsRes.client.loader,
              msgType: rawURL.host.includes("discordapp") ? "uploaded" : "sent",
              ign: mclogsRes.profile.ign
                ? Util.escapeMarkdown(mclogsRes.profile.ign)
                : undefined,
            }
          ),
          allowedMentions,
          components,
        });
    }
  }
}
