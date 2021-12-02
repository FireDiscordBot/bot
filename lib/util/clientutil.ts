import {
  version as djsver,
  LimitedCollection,
  PermissionString,
  GuildFeatures,
  ThreadChannel,
  MessageEmbed,
  GuildPreview,
  OAuth2Guild,
  Permissions,
  Collection,
  Snowflake,
  Webhook,
} from "discord.js";
import {
  GuildMemberCountFilter,
  GuildIdRangeFilter,
  ExperimentFilters,
  ExperimentRange,
  FeatureFilter,
  Experiments,
} from "../interfaces/discord";
import { GuildTextChannel, humanize, titleCase } from "./constants";
import { Channel, Video } from "@fire/lib/interfaces/youtube";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { PremiumData } from "@fire/lib/interfaces/premium";
import { FireMessage } from "@fire/lib/extensions/message";
import { DiscordExperiment } from "../interfaces/aether";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Language, LanguageKeys } from "./language";
import { ClusterStats } from "../interfaces/stats";
import { PaginatorInterface } from "./paginators";
import { Message } from "@fire/lib/ws/Message";
import { ClientUtil } from "discord-akairo";
import { getCommitHash } from "./gitUtils";
import { murmur3 } from "murmurhash-js";
import { Fire } from "@fire/lib/Fire";
import * as pidusage from "pidusage";
import { cpus, totalmem } from "os";
import * as centra from "centra";

export const humanFileSize = (size: number) => {
  let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    Number((size / Math.pow(1024, i)).toFixed(2)) * 1 +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
};

const AllowedImageFormats = ["webp", "png", "jpg", "jpeg", "gif"];
const AllowedImageSizes = Array.from({ length: 9 }, (e, i) => 2 ** (i + 4));

interface MojangProfile {
  name: string;
  id: string;
}

export class Util extends ClientUtil {
  paginators: LimitedCollection<Snowflake, PaginatorInterface>;
  loadedData: { plonked: boolean; premium: boolean };
  permissionFlags: [PermissionString, bigint][];
  premium: Collection<string, PremiumData>;
  uuidCache: Collection<string, string>;
  hasRoleUpdates: string[];
  declare client: Fire;
  plonked: string[];
  admins: string[];

  constructor(client: Fire) {
    super(client);
    this.loadedData = { plonked: false, premium: false };
    this.paginators = new LimitedCollection({
      sweepFilter: () => {
        return (paginator: PaginatorInterface) =>
          !!paginator.message &&
          +new Date() - paginator.lastInteraction > 150000;
      },
      sweepInterval: 60,
    });
    this.uuidCache = new Collection();
    this.premium = new Collection();
    this.hasRoleUpdates = [];
    this.plonked = [];

    this.permissionFlags = Object.entries(Permissions.FLAGS) as [
      PermissionString,
      bigint
    ][];
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isPromise(value: any) {
    return value && typeof value.then == "function";
  }

  isASCII(str: string, extended = false) {
    return (extended ? /^[\x00-\xFF]*$/im : /^[\x00-\x7F]*$/im).test(str);
  }

  shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  randInt(min: number = 0, max: number = 69) {
    return Math.floor(Math.random() * max) + min;
  }

  getShard(guild: string | FireGuild) {
    const id = guild instanceof FireGuild ? guild.id : guild;
    return Number((BigInt(id) >> 22n) % BigInt(this.client.options.shardCount));
  }

  getDiscoverableGuilds() {
    return this.client.guilds.cache
      .filter((guild: FireGuild) => guild.isPublic())
      .map((guild: FireGuild) => guild.getDiscoverableData());
  }

  async haste<R extends boolean = false>(
    text: string,
    fallback?: boolean,
    language?: string,
    raw?: R
  ): Promise<R extends true ? { url: string; raw: string } : string> {
    const url = fallback ? "https://h.inv.wtf/" : "https://hst.sh/";
    try {
      const h: { key: string } = await (
        await centra(url, "POST")
          .path("/documents")
          .body(text, "buffer")
          .header("User-Agent", this.client.manager.ua)
          .send()
      ).json();
      if (!h.key) throw new Error(JSON.stringify(h));
      const fullURL = language
        ? `${url}${h.key}.${language}`
        : `${url}${h.key}`;
      return (
        raw
          ? {
              url: fullURL,
              raw: language
                ? `${url}raw/${h.key}.${language}`
                : `${url}raw/${h.key}`,
            }
          : url + h.key + (language ? "." + language : "")
      ) as any;
    } catch (e) {
      e.message += ` (Haste Service: ${url})`;
      if (!fallback) return await this.haste(text, true, language, raw);
      else throw e;
    }
  }

  async nameToUUID(player: string, dashed: boolean = false) {
    if (this.uuidCache.has(player))
      return dashed
        ? this.addDashesToUUID(this.uuidCache.get(player))
        : this.uuidCache.get(player);
    const profileReq = await centra(
      `https://api.mojang.com/users/profiles/minecraft/${player}`
    )
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (profileReq.statusCode == 200) {
      const profile: MojangProfile = await profileReq.json();
      this.uuidCache.set(player, profile.id);
      return dashed ? this.addDashesToUUID(profile.id) : profile.id;
    } else return null;
  }

  addDashesToUUID = (uuid: string) =>
    uuid.substr(0, 8) +
    "-" +
    uuid.substr(8, 4) +
    "-" +
    uuid.substr(12, 4) +
    "-" +
    uuid.substr(16, 4) +
    "-" +
    uuid.substr(20);

  getUserStatuses(shard?: number) {
    try {
      return {
        online:
          this.client.guilds.cache.size > 1
            ? this.client.guilds.cache
                .filter((guild) => !shard || guild.shardId == shard)
                .map(
                  (guild) =>
                    guild.members.cache.filter(
                      (member) => member.presence.status == "online"
                    ).size
                )
                .reduce((a, b) => a + b)
            : 0,
        dnd:
          this.client.guilds.cache.size > 1
            ? this.client.guilds.cache
                .filter((guild) => !shard || guild.shardId == shard)
                .map(
                  (guild) =>
                    guild.members.cache.filter(
                      (member) => member.presence.status == "dnd"
                    ).size
                )
                .reduce((a, b) => a + b)
            : 0,
        idle:
          this.client.guilds.cache.size > 1
            ? this.client.guilds.cache
                .filter((guild) => !shard || guild.shardId == shard)
                .map(
                  (guild) =>
                    guild.members.cache.filter(
                      (member) => member.presence.status == "idle"
                    ).size
                )
                .reduce((a, b) => a + b)
            : 0,
        offline:
          this.client.guilds.cache.size > 1
            ? this.client.guilds.cache
                .filter((guild) => !shard || guild.shardId == shard)
                .map(
                  (guild) =>
                    guild.members.cache.filter(
                      (member) => member.presence.status == "offline"
                    ).size
                )
                .reduce((a, b) => a + b)
            : 0,
      };
    } catch {
      return { online: 0, dnd: 0, idle: 0, offline: 0 };
    }
  }

  async getClusterStats(): Promise<ClusterStats> {
    const processStats = await pidusage(process.pid);
    processStats.memory = process.memoryUsage().heapUsed;
    const env = (process.env.NODE_ENV || "DEVELOPMENT").toLowerCase();
    return {
      id: this.client.manager.id,
      name: this.client.user
        ? `${this.client.user.username
            .replace(/\s/gim, "")
            .toLowerCase()}-${env}-${this.client.manager.id}`
        : `fire-${env}-${this.client.manager.id}`,
      env: env,
      user: this.client.user ? this.client.user.toString() : "Unknown#0000",
      userId: this.client.user ? this.client.user.id : "",
      started: new Date(this.client.launchTime).toISOString(),
      uptime: humanize(+new Date() - this.client.launchTime, "en"),
      cpu: parseFloat((processStats.cpu / cpus().length).toFixed(2)),
      ram: humanFileSize(processStats.memory),
      ramBytes: processStats.memory,
      totalRam: humanFileSize(totalmem()),
      totalRamBytes: totalmem(),
      pid: process.pid,
      version: this.client.config.dev ? "dev" : getCommitHash().slice(0, 7),
      versions: `Discord.JS v${djsver} | Node.JS ${process.version}`,
      guilds: this.client.guilds.cache.filter((guild) => guild.available).size,
      unavailableGuilds: this.client.guilds.cache.filter(
        (guild) => !guild.available
      ).size,
      users:
        this.client.guilds.cache.size >= 1
          ? this.client.guilds.cache
              .map((guild) => guild.memberCount || 0)
              .reduce((a, b) => a + b)
          : 0,
      commands: this.client.commandHandler.modules.size,
      restPing: this.client.restPing,
      shards: [...this.client.ws.shards.values()].map((shard) => {
        return {
          id: shard.id,
          wsPing: shard.ping,
          guilds: this.client.guilds.cache.filter(
            (guild) => guild.shardId == shard.id && guild.available
          ).size,
          unavailableGuilds: this.client.guilds.cache.filter(
            (guild) => guild.shardId == shard.id && !guild.available
          ).size,
          users:
            this.client.guilds.cache.filter(
              (guild) => guild.shardId == shard.id
            ).size >= 1
              ? this.client.guilds.cache
                  .filter((guild) => guild.shardId == shard.id)
                  .map((guild) => guild.memberCount || 0)
                  .reduce((a, b) => a + b)
              : 0,
          status: shard.status as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        };
      }),
    };
  }

  cleanPermissionName(
    permission: PermissionString | BigInt,
    language?: Language
  ): string {
    let name: PermissionString;
    if (typeof permission == "bigint")
      name = this.bitToPermissionString(permission);
    else if (typeof permission == "string") name = permission;
    if (!name) return null;
    language = language ?? this.client.getLanguage("en-US");
    if (language.has(`PERMISSIONS.${name}` as LanguageKeys))
      return language.get(`PERMISSIONS.${name}` as LanguageKeys);
    return titleCase(
      name.toLowerCase().replace(/_/gim, " ").replace(/guild/, "server")
    );
  }

  cleanFeatureName(feature: string, language?: Language): string {
    language = language ?? this.client.getLanguage("en-US");
    if (language.has(`FEATURES.${feature}` as LanguageKeys))
      return language.get(`FEATURES.${feature}` as LanguageKeys);
    return titleCase(
      feature.toLowerCase().replace(/_/gim, " ").replace(/guild/, "server")
    );
  }

  bitToPermissionString(permission: bigint) {
    const found = this.permissionFlags.find(([, bit]) => bit == permission);
    if (found?.length) return found[0];
    else return null;
  }

  shorten(items: any[], max = 1000, sep = ", ") {
    let text = "";

    while (text.length < max && items.length > 0) {
      text += `${items.shift()}${sep}`;
    }

    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);

    return items.length > 0 && text.length < 11 + items.toString().length
      ? `${text} and ${items.length} more...`
      : text;
  }

  numberWithSuffix(num: number, toLocale: boolean = true) {
    let suffixed: string = toLocale ? num.toLocaleString() : num.toString();
    // shit code tm
    if (suffixed.endsWith("1"))
      suffixed = suffixed + (suffixed.endsWith("11") ? "th" : "st");
    else if (suffixed.endsWith("2"))
      suffixed = suffixed + (suffixed.endsWith("12") ? "th" : "nd");
    else if (suffixed.endsWith("3"))
      suffixed = suffixed + (suffixed.endsWith("13") ? "th" : "rd");
    else if (
      ["4", "5", "6", "7", "8", "9", "0"].some((num) =>
        suffixed.toString().endsWith(num)
      )
    )
      suffixed = suffixed.toString() + "th";
    return suffixed;
  }

  isSuperuser(user: Snowflake) {
    return this.client.userSettings.get<boolean>(
      user,
      "utils.superuser",
      false
    );
  }

  isBlacklisted(
    user: FireMember | FireUser | Snowflake,
    guild?: FireGuild,
    command?: string
  ) {
    // Conditions where blacklist does not apply
    if (command == "debug") return false;
    else if (typeof user != "string" && user.isSuperuser()) return false;
    else if (typeof user == "string" && this.isSuperuser(user)) return false;

    // convert user/member to id
    if (user instanceof FireMember || user instanceof FireUser) user = user.id;

    // global blacklist
    if (this.plonked.includes(user)) return true;

    // guild blacklist
    if (guild?.settings.get<string[]>("utils.plonked", []).includes(user))
      return true;

    return false;
  }

  async blacklist(user: FireMember | FireUser, reason: string) {
    if (user.isSuperuser()) return false;
    try {
      if (this.client.util.plonked.includes(user.id))
        await this.updateBlacklist(user, reason);
      else await this.insertBlacklist(user, reason);
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.BLACKLIST_SYNC, {
            id: this.client.manager.id,
            user: user.id,
            action: "blacklist",
          })
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async unblacklist(user: FireMember | FireUser) {
    try {
      await this.deleteBlacklist(user);
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.BLACKLIST_SYNC, {
            id: this.client.manager.id,
            user: user.id,
            action: "unblacklist",
          })
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  private async insertBlacklist(user: FireMember | FireUser, reason: string) {
    const username =
      user instanceof FireMember ? user.user.username : user.username;
    await this.client.db.query(
      'INSERT INTO blacklist ("user", uid, reason) VALUES ($1, $2, $3);',
      [username, user.id, reason]
    );
    this.client.util.plonked.push(user.id);
    this.client.console.warn(`[Blacklist] Successfully blacklisted ${user}`);
  }

  private async updateBlacklist(user: FireMember | FireUser, reason: string) {
    const username =
      user instanceof FireMember ? user.user.username : user.username;
    await this.client.db.query(
      "UPDATE blacklist user=$1, reason=$2 WHERE uid=$4;",
      [username, reason, user.id]
    );
    this.client.console.warn(
      `[Blacklist] Successfully updated blacklist for ${user}`
    );
  }

  private async deleteBlacklist(user: FireMember | FireUser) {
    await this.client.db.query("DELETE FROM blacklist WHERE uid=$1;", [
      user.id,
    ]);
    this.client.util.plonked = this.client.util.plonked.filter(
      (u) => u != user.id
    );
    this.client.console.warn(`[Blacklist] Successfully unblacklisted ${user}`);
  }

  static greedyArg = (
    converter: (message: FireMessage, phrase: string, silent?: boolean) => any
  ) => {
    return async (message: FireMessage, phrase: string) => {
      let converted: any[] = [];
      let splitPhrase: string[];
      if (phrase.includes(","))
        splitPhrase = phrase.replace(/, /gim, ",").split(",");
      else splitPhrase = phrase.split(" ");
      const converters = async () => {
        splitPhrase.forEach(async (phrase) => {
          const result = await converter(message, phrase.trim(), true);
          if (result) converted.push(result);
        });
      };
      await converters(); // Ensures everything gets converted before returning
      return converted.length ? converted : null;
    };
  };

  async getYouTubeVideo(id: string) {
    if (!process.env.YOUTUBE_KEY) return false;
    const videoReq = await centra(
      `https://www.googleapis.com/youtube/v3/videos`
    )
      .header("User-Agent", this.client.manager.ua)
      .query("key", process.env.YOUTUBE_KEY)
      .query("id", id)
      .query("part", "snippet,contentDetails,statistics")
      .send();
    if (videoReq.statusCode != 200) return false;
    const video: Video = await videoReq.json();
    return video;
  }

  async getYouTubeChannel(id: string) {
    if (!process.env.YOUTUBE_KEY) return false;
    const channelReq = await centra(
      `https://www.googleapis.com/youtube/v3/channels`
    )
      .header("User-Agent", this.client.manager.ua)
      .query("key", process.env.YOUTUBE_KEY)
      .query(id.startsWith("UC") ? "id" : "forUsername", id)
      .query("part", "snippet,statistics")
      .send();
    if (channelReq.statusCode != 200) return false;
    const channel: Channel = await channelReq.json();
    return channel;
  }

  async getQuoteWebhookURL(destination: GuildTextChannel | ThreadChannel) {
    let thread: ThreadChannel;
    if (destination instanceof ThreadChannel) {
      // we can't assign thread to destination since we're reassigning it
      thread = this.client.channels.cache.get(destination.id) as ThreadChannel;
      destination = destination.parent as GuildTextChannel;
    } else if (typeof destination.fetchWebhooks != "function") return;
    const hooks = await destination.fetchWebhooks().catch(() => {});
    let hook: Webhook;
    if (hooks) hook = hooks.filter((hook) => !!hook.token).first();
    if (!hook) {
      hook = await destination
        .createWebhook(`Fire Quotes #${destination.name}`, {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: (destination.guild as FireGuild).language.get(
            "QUOTE_WEBHOOK_CREATE_REASON"
          ) as string,
        })
        .catch(() => null);
    }
    return thread && hook?.url
      ? `${hook?.url}?thread_id=${thread.id}`
      : hook?.url;
  }

  makeImageUrl(root: string, { format = "webp", size = 512 } = {}) {
    if (format && !AllowedImageFormats.includes(format))
      throw new Error(`Invalid image format: ${format}`);
    if (size && !AllowedImageSizes.includes(size))
      throw new RangeError(`Invalid image size: ${size}`);
    return `${root}.${format}${size ? `?size=${size}` : ""}`;
  }

  async getFriendlyGuildExperiments(
    id: Snowflake,
    guild?: FireGuild | GuildPreview | OAuth2Guild
  ) {
    const knownExperiments: { [hash: number]: DiscordExperiment } = {};
    for (const experiment of this.client.manager.state.discordExperiments)
      knownExperiments[experiment.hash] = experiment;

    const { guild_experiments: GuildExperiments } =
      await this.client.req.experiments
        .get<Experiments>({ query: { with_guild_experiments: true } })
        .catch(() => {
          return {
            assignments: [],
            guild_experiments: [],
          } as Experiments;
        });

    const hashAndBucket: (
      | [number, number]
      | [number, number, ExperimentRange]
    )[] = [];
    for (const experiment of GuildExperiments) {
      if (experiment.length != 5) continue;
      const override = experiment[4].find((o) => o.k.includes(id));
      if (override && typeof override.b == "number")
        hashAndBucket.push([experiment[0], override.b]);
      const buckets = experiment[3];
      let filters: ExperimentFilters[] = [];
      for (const bucket of buckets)
        for (const bucketAndRanges of bucket.reverse()) {
          if (
            bucketAndRanges.some(
              (br: Array<unknown>) => br?.length && br[0] > 100000000
            )
          ) {
            // we hit filters
            filters = bucketAndRanges as unknown as ExperimentFilters[];
            continue;
          }
          for (const [b, r] of bucketAndRanges as [
            number,
            ExperimentRange[]
          ][]) {
            if (b == -1) continue;
            const known = knownExperiments[experiment[0]];
            if (!known) continue;
            const guildRange = murmur3(`${known.id}:${id}`) % 1e4;
            for (const startAndEnd of r)
              if (
                !(
                  startAndEnd.s == 0 &&
                  startAndEnd.e == 1e4 &&
                  !filters.length
                ) &&
                guildRange >= startAndEnd.s &&
                guildRange < startAndEnd.e &&
                this.applyFilters(guild, filters)
              ) {
                hashAndBucket.push([experiment[0], b, startAndEnd]);
                continue;
              }
          }
        }
    }

    if (hashAndBucket.length) {
      const friendlyExperiments: string[] = [];
      for (const data of hashAndBucket) {
        let ranges: ExperimentRange;
        const [hash, bucket] = data;
        if (data.length == 3) ranges = data[2];
        const experiment = knownExperiments[hash];
        if (experiment) {
          const guildRange = ranges
            ? murmur3(`${experiment.id}:${id}`) % 1e4
            : null;
          friendlyExperiments.push(
            ranges && !(ranges.s == 0 && ranges.e == 1e4)
              ? `${titleCase(experiment.title)} | ${titleCase(
                  experiment.description[bucket]
                )} | ${guildRange} / ${ranges.s} - ${ranges.e}`
              : `${titleCase(experiment.title)} | ${titleCase(
                  experiment.description[bucket]
                )}`
          );
        }
      }
      if (friendlyExperiments.length) return friendlyExperiments;
    }

    return [];
  }

  private applyFilters(
    guild: FireGuild | GuildPreview | OAuth2Guild,
    filters: ExperimentFilters[]
  ) {
    if (!filters.length) return true;
    // we don't have a guild to apply filters to and the range is full so return false
    else if (!guild) return false;
    let isEligible = true;
    const featureFilters = filters.filter(
      (filter) => filter[0] == 1604612045
    ) as FeatureFilter[];
    const idRangeFilters = filters.filter(
      (filter) => filter[0] == 2404720969
    ) as GuildIdRangeFilter[];
    const memberCountFilters = filters.filter(
      (filter) => filter[0] == 2918402255
    ) as GuildMemberCountFilter[];
    try {
      if (featureFilters.length)
        isEligible =
          isEligible &&
          guild?.features.length &&
          featureFilters.every((filter) => {
            const requiresFeatures = filter[1].flatMap(
              ([, features]) => features
            ) as GuildFeatures[];
            if (!requiresFeatures.length) return true;
            return requiresFeatures.every((feature) =>
              guild.features.includes(feature)
            );
          });
      if (idRangeFilters.length)
        isEligible =
          isEligible &&
          idRangeFilters.every((filter) => {
            const id = BigInt(guild.id);
            const min =
              typeof filter[1][1] == "string" ? BigInt(filter[1][1]) : null;
            const max =
              typeof filter[2][1] == "string" ? BigInt(filter[2][1]) : null;
            return (min == null || id >= min) && (max == null || id <= max);
          });
      if (memberCountFilters.length)
        isEligible =
          isEligible &&
          memberCountFilters.every((filter) => {
            let count = -1;
            if (guild instanceof FireGuild) count = guild.memberCount;
            else if (guild instanceof GuildPreview)
              count = guild.approximateMemberCount;
            const min =
              filter.flat().find((f) => f[0] == 3399957344)?.[1] ?? null;
            const max =
              filter.flat().find((f) => f[0] == 1238858341)?.[1] ?? null;
            return (
              (min == null || count >= min) && (max == null || count <= max)
            );
          });
    } catch {}
    return isEligible;
  }

  async getSlashUpsellEmbed(message: FireMessage) {
    if (
      !message.hasExperiment(3144709624, 1) ||
      message.hasExperiment(93659956, 1)
    )
      return false;
    else if (!(message instanceof FireMessage)) return false;
    const slashCommands = await message.client
      .requestSlashCommands(message.guild)
      .catch(() => {});
    if (typeof slashCommands == "undefined") return false;
    let upsellType: "switch" | "invite" | "noslash";
    const hasSlash =
      slashCommands &&
      !!slashCommands.applications.find(
        (app) => app.id == message.client.user.id
      );
    if (message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
      if (hasSlash) upsellType = "switch";
      else upsellType = "invite";
    else if (hasSlash) upsellType = "switch";
    else upsellType = "noslash";

    let upsellEmbed: MessageEmbed;
    if (upsellType == "invite")
      upsellEmbed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setAuthor({
          name: message.language.get("NOTICE_TITLE"),
          iconURL: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
        })
        .setDescription(
          message.language.get("COMMAND_NOTICE_SLASH_UPSELL", {
            invite: this.client.config.commandsInvite(
              this.client,
              message.guild.id
            ),
          })
        );
    else if (upsellType == "noslash")
      upsellEmbed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setAuthor({
          name: message.language.get("NOTICE_TITLE"),
          iconURL: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
        })
        .setDescription(
          message.language.get("COMMAND_NOTICE_SLASH_POKE", {
            invite: this.client.config.commandsInvite(
              this.client,
              message.guild.id
            ),
          })
        );
    else if (upsellType == "switch")
      upsellEmbed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setAuthor({
          name: message.language.get("NOTICE_TITLE"),
          iconURL: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
        })
        .setDescription(
          message.language.get("COMMAND_NOTICE_SLASH_SWITCH", {
            invite: this.client.config.commandsInvite(
              this.client,
              message.guild.id
            ),
          })
        );
    return upsellEmbed;
  }

  getModCommandSlashWarning(guild: FireGuild) {
    if (!guild.hasExperiment(966055531, 1)) return [];
    return [
      new MessageEmbed()
        .setColor("RED")
        .setAuthor({
          name: "Fire",
          iconURL: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
        })
        .setDescription(
          guild.language.get("COMMAND_NOTICE_MOD_SLASH", {
            invite: this.client.config.commandsInvite(this.client, guild.id),
          })
        ),
    ];
  }
}
