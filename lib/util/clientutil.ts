import {
  version as djsver,
  PermissionString,
  Permissions,
  Collection,
  Snowflake,
  Webhook,
} from "discord.js";
import { Channel, Video } from "@fire/lib/interfaces/youtube";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "../extensions/textchannel";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { PremiumData } from "@fire/lib/interfaces/premium";
import { FireMessage } from "@fire/lib/extensions/message";
import { DiscordExperiment } from "../interfaces/aether";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Cluster } from "@fire/lib/interfaces/stats";
import { FireUser } from "@fire/lib/extensions/user";
import { Experiments } from "../interfaces/discord";
import { humanize, titleCase } from "./constants";
import { Message } from "@fire/lib/ws/Message";
import { ClientUtil } from "discord-akairo";
import { getCommitHash } from "./gitUtils";
import { murmur3 } from "murmurhash-js";
import { Fire } from "@fire/lib/Fire";
import { Language } from "./language";
import * as pidusage from "pidusage";
import * as Centra from "centra";
import * as moment from "moment";
import { totalmem } from "os";

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
    return (this.client.guilds.cache
      .filter((guild: FireGuild) => guild.isPublic())
      .array() as FireGuild[]).map((guild) => guild.getDiscoverableData());
  }

  async haste(
    text: string,
    fallback = false,
    language: string = ""
  ): Promise<string> {
    const url = fallback ? "https://h.inv.wtf/" : "https://hst.sh/";
    try {
      const h: { key: string } = await (
        await Centra(url, "POST")
          .path("/documents")
          .body(text, "buffer")
          .header("User-Agent", this.client.manager.ua)
          .send()
      ).json();
      if (!h.key) throw new Error(JSON.stringify(h));
      return url + h.key + (language ? "." + language : "");
    } catch (e) {
      e.message += ` (Haste Service: ${url})`;
      if (!fallback) return await this.haste(text, true, language);
      else throw e;
    }
  }

  async nameToUUID(player: string) {
    if (this.uuidCache.has(player)) return this.uuidCache.get(player);
    const profileReq = await Centra(
      `https://api.mojang.com/users/profiles/minecraft/${player}`
    ).send();
    if (profileReq.statusCode == 200) {
      const profile: MojangProfile = await profileReq.json();
      this.uuidCache.set(player, profile.id);
      return profile.id;
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
                .filter((guild) => !shard || guild.shardID == shard)
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
                .filter((guild) => !shard || guild.shardID == shard)
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
                .filter((guild) => !shard || guild.shardID == shard)
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
                .filter((guild) => !shard || guild.shardID == shard)
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

  async getClusterStats(): Promise<Cluster> {
    const processStats = await pidusage(process.pid);
    processStats.memory = process.memoryUsage().heapUsed;
    const now = moment();
    const duration = this.client.launchTime.diff(now);
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
      started: this.client.launchTime.toISOString(true),
      uptime: humanize(duration, "en"),
      cpu: parseFloat(processStats.cpu.toFixed(2)),
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
            (guild) => guild.shardID == shard.id && guild.available
          ).size,
          unavailableGuilds: this.client.guilds.cache.filter(
            (guild) => guild.shardID == shard.id && !guild.available
          ).size,
          users:
            this.client.guilds.cache.filter(
              (guild) => guild.shardID == shard.id
            ).size >= 1
              ? this.client.guilds.cache
                  .filter((guild) => guild.shardID == shard.id)
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
    if (
      language &&
      ((language.get("PERMISSIONS") as unknown) as Record<
        string,
        string
      >).hasOwnProperty(name)
    )
      return ((language.get("PERMISSIONS") as unknown) as Record<
        string,
        string
      >)[name];
    return titleCase(
      name.toLowerCase().replace(/_/gim, " ").replace(/guild/gim, "server")
    );
  }

  bitToPermissionString(permission: bigint) {
    const found = this.permissionFlags.find(([, bit]) => bit == permission);
    if (found?.length) return found[0];
    else return null;
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
    const videoReq = await Centra(
      `https://www.googleapis.com/youtube/v3/videos`
    )
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
    const channelReq = await Centra(
      `https://www.googleapis.com/youtube/v3/channels`
    )
      .query("key", process.env.YOUTUBE_KEY)
      .query(id.startsWith("UC") ? "id" : "forUsername", id)
      .query("part", "snippet,statistics")
      .send();
    if (channelReq.statusCode != 200) return false;
    const channel: Channel = await channelReq.json();
    return channel;
  }

  async getQuoteWebhookURL(destination: FireTextChannel) {
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
    return hook?.url;
  }

  makeImageUrl(root: string, { format = "webp", size = 512 } = {}) {
    if (format && !AllowedImageFormats.includes(format))
      throw new Error(`Invalid image format: ${format}`);
    if (size && !AllowedImageSizes.includes(size))
      throw new RangeError(`Invalid image size: ${size}`);
    return `${root}.${format}${size ? `?size=${size}` : ""}`;
  }

  async getFriendlyGuildExperiments(id: Snowflake) {
    const knownExperiments: { [hash: number]: DiscordExperiment } = {};
    for (const experiment of this.client.manager.state.discordExperiments) {
      const hash = murmur3(experiment.id);
      knownExperiments[hash] = experiment;
    }

    const {
      guild_experiments: GuildExperiments,
    } = await this.client.req.experiments
      .get<Experiments>({ query: { with_guild_experiments: true } })
      .catch(() => {
        return {
          assignments: [],
          guild_experiments: [],
        } as Experiments;
      });

    const hashAndBucket: [number, number][] = [];
    for (const experiment of GuildExperiments) {
      if (experiment.length != 5) continue;
      const bucket = experiment[4].find((o) => o.k.includes(id));
      if (bucket && typeof bucket.b == "number")
        hashAndBucket.push([experiment[0], bucket.b]);
    }

    if (hashAndBucket.length) {
      const friendlyExperiments: string[] = [];
      for (const [hash, bucket] of hashAndBucket) {
        const experiment = knownExperiments[hash];
        if (experiment)
          friendlyExperiments.push(
            `${titleCase(experiment.title)} | ${titleCase(
              experiment.description[bucket]
            )}`
          );
      }
      if (friendlyExperiments.length) return friendlyExperiments;
    }

    return [];
  }
}
