import {
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnection,
  createAudioPlayer,
} from "@discordjs/voice";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { PremiumData } from "@fire/lib/interfaces/premium";
import { Channel, Video } from "@fire/lib/interfaces/youtube";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import * as centra from "centra";
import { ClientUtil } from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  Collection,
  GuildChannel,
  GuildTextBasedChannel,
  LimitedCollection,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  PermissionString,
  Permissions,
  SnowflakeUtil,
  ThreadChannel,
  Webhook,
  version as djsver,
} from "discord.js";
import { murmur3 } from "murmurhash-js";
import { cpus, totalmem } from "os";
import * as pidusage from "pidusage";
import { Readable } from "stream";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { ClusterStats } from "../interfaces/stats";
import { Command } from "./command";
import { CouponType, GuildTextChannel, titleCase } from "./constants";
import { Language, LanguageKeys } from "./language";
import { PaginatorInterface } from "./paginators";
import { UserSettings } from "./settings";

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

const guildRegex = /guild/,
  underscoreRegex = /_/gim;

export class MojangAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export class ProfileNotFoundError extends MojangAPIError {
  constructor() {
    super("Player not found", 404);
  }
}

export class UUIDConflictError extends MojangAPIError {
  ign: string;
  checkUUID: string;
  constructor(ign: string, checkUUID: string) {
    super("UUID conflict", 209);
    this.ign = ign;
    this.checkUUID = checkUUID;
  }
}

export class ProfileConflictError extends MojangAPIError {
  profile: MojangProfile;
  constructor(profile: MojangProfile) {
    super("IGN does not match requested, UUID matches checked", 209);
    this.profile = profile;
  }
}

type PasteURL =
  | "h.inv.wtf"
  | "hst.sh"
  | "paste.ee"
  | "api.paste.ee"
  | "mclo.gs"
  | "api.mclo.gs"
  | "pastebin.com"
  | "paste.essential.gg"
  | "github.com"
  | "raw.githubusercontent.com"
  | "objects.githubusercontent.com"
  | "cdn.discordapp.com";
export const validPasteURLs: PasteURL[] = [
  "h.inv.wtf",
  "hst.sh",
  "paste.ee",
  "api.paste.ee",
  "mclo.gs",
  "api.mclo.gs",
  "pastebin.com",
  "paste.essential.gg",
  "github.com",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "cdn.discordapp.com",
];

interface MojangProfile {
  name: string;
  id: string;
  idDashed: string;
}

type SpecialCouponCreateResponse =
  | {
      success: false;
      reason: LanguageKeys;
    }
  | {
      success: true;
      code: string;
      expires: number;
      amount: number;
      products: string;
    };

type SpecialCouponDeleteResponse =
  | { success: true }
  | { success: false; reason: string };

type SpecialCouponUpdateResponse =
  | {
      success: false;
      reason: string;
    }
  | {
      success: true;
      code: string;
      expires: number;
      amount: number;
      products: string;
      reused?: true;
    };

export class Util extends ClientUtil {
  paginators: LimitedCollection<Snowflake, PaginatorInterface>;
  loadedData: { plonked: boolean; premium: boolean };
  mcProfileCache: Collection<string, MojangProfile & { retrievedAt: Date }>;
  assistantAudioPlayers: Collection<Snowflake, AudioPlayer>;
  permissionFlags: [PermissionString, bigint][];
  premium: Collection<string, PremiumData>;
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
    this.assistantAudioPlayers = new Collection();
    this.mcProfileCache = new Collection();
    this.premium = new Collection();
    this.hasRoleUpdates = [];
    this.plonked = [];

    this.permissionFlags = Object.entries(Permissions.FLAGS) as [
      PermissionString,
      bigint
    ][];
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms)) as Promise<void>;
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
    if (guild == "@me") return 0; // DMs are always on shard 0
    const id = guild instanceof FireGuild ? guild.id : guild;
    return Number((BigInt(id) >> 22n) % BigInt(this.client.options.shardCount));
  }

  useEmoji(name: string) {
    const emoji = this.client.manager.state.appEmojis.find(
      (emoji) => emoji.name == name
    );
    if (!emoji) return "";
    return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
  }

  getEmoji(name: string) {
    return this.client.manager.state.appEmojis.find(
      (emoji) => emoji.name == name
    );
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

  async mcProfile(player: string, uuid?: string) {
    if (!this.client.manager.REST_HOST)
      throw new MojangAPIError("No REST host set", 500);
    const profileReq = await centra(
      `${this.client.manager.REST_HOST}/${
        this.client.manager.CURRENT_REST_VERSION
      }/minecraft/uuid/${player}?checkUUID=${uuid ?? "false"}`
    )
      .header("User-Agent", this.client.manager.ua)
      .send();
    const body = await profileReq.json();
    if (profileReq.statusCode == 404) throw new ProfileNotFoundError();
    else if (
      profileReq.statusCode == 209 &&
      "success" in body &&
      body.success == false
    )
      throw new UUIDConflictError(player, uuid);
    else if (profileReq.statusCode == 209) {
      // We should have a profile here, but the name will be different
      if (
        "name" in body &&
        body.name != player &&
        "id" in body &&
        "idDashed" in body &&
        (uuid == body.id || uuid == body.idDashed)
      )
        throw new ProfileConflictError(body as MojangProfile);
      else throw new MojangAPIError("Conflict", 209);
    } else if (profileReq.statusCode != 200)
      throw new MojangAPIError(
        body.error ?? "Unknown error",
        profileReq.statusCode
      );
    else return body as MojangProfile;
  }

  createAssistantAudioPlayer(
    user: FireMember | FireUser,
    connection: VoiceConnection
  ) {
    if (this.assistantAudioPlayers.has(user.id))
      return this.assistantAudioPlayers.get(user.id);
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    player.on("stateChange", async (oldState, newState) => {
      if (
        oldState.status == AudioPlayerStatus.Playing &&
        newState.status == AudioPlayerStatus.Idle
      ) {
        await this.client.util.sleep(8000);
        if (player.state.status != AudioPlayerStatus.Playing) {
          try {
            connection.destroy();
            player.stop(true);
            this.client.util.assistantAudioPlayers.delete(user.id);
          } catch {}
        }
      }
    });
    this.assistantAudioPlayers.set(user.id, player);
    return player;
  }

  addDashesToUUID = (uuid: string) =>
    uuid.slice(0, 8) +
    "-" +
    uuid.slice(8, 12) +
    "-" +
    uuid.slice(12, 16) +
    "-" +
    uuid.slice(16, 20) +
    "-" +
    uuid.slice(20);

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
    const cachedThreads = this.client.channels.cache.filter((c) =>
      c.isThread()
    );
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
      uptime: `Since ${new Date(this.client.launchTime).toLocaleString()}`,
      cpu: parseFloat((processStats.cpu / cpus().length).toFixed(2)),
      ram: humanFileSize(processStats.memory),
      ramBytes: processStats.memory,
      totalRam: humanFileSize(totalmem()),
      totalRamBytes: totalmem(),
      pid: process.pid,
      version: this.client.config.dev
        ? "dev"
        : this.client.manager.commit.slice(0, 7),
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
      caches: {
        members: this.client.guilds.cache.reduce(
          (a, b) => a + b.members.cache.size,
          0
        ),
        users: this.client.users.cache.size,
        channels: this.client.channels.cache.size,
        threads: cachedThreads.size,
        threadMembers: cachedThreads.reduce(
          (a, b) => a + (b as ThreadChannel).members.cache.size,
          0
        ),
        roles: this.client.guilds.cache.reduce(
          (a, b) => a + b.roles.cache.size,
          0
        ),
        permissionOverwrites: this.client.channels.cache
          .filter((c) => c instanceof GuildChannel)
          .reduce(
            (a, b: GuildTextChannel) => a + b.permissionOverwrites.cache.size,
            0
          ),
        messages: this.client.channels.cache
          .filter((c) => c.hasOwnProperty("messages"))
          .reduce(
            (a, b: GuildTextBasedChannel) => a + b.messages.cache.size,
            0
          ),
        voiceStates: this.client.guilds.cache.reduce(
          (a, b) => a + b.voiceStates.cache.size,
          0
        ),
      },
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
      name
        .toLowerCase()
        .replace(underscoreRegex, " ")
        .replace(guildRegex, "server")
    );
  }

  cleanFeatureName(feature: string, language?: Language): string {
    language = language ?? this.client.getLanguage("en-US");
    if (language.has(`FEATURES.${feature}` as unknown as LanguageKeys))
      return language.get(`FEATURES.${feature}` as unknown as LanguageKeys);
    return titleCase(feature.toLowerCase().replace(guildRegex, "server"), "_");
  }

  bitToPermissionString(permission: bigint) {
    const found = this.permissionFlags.find(([, bit]) => bit == permission);
    if (found?.length) return found[0];
    else return null;
  }

  shorten(items: any[], max = 1000, sep = ", ") {
    let text = "";
    const ending = () => ` and ${items.length} more...`;

    while (items.length > 0) {
      const item = items.shift();
      const addition = `${item}${sep}`;
      if (
        text.length + addition.length >
        // account for ending or the trailing separator that will be removed
        (items.length ? max - ending().length : max + sep.length)
      ) {
        items.unshift(item); // return the item to the array
        break;
      }
      text += addition;
    }

    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);

    return items.length > 0 ? `${text}${ending()}` : text;
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

  usableCommandFilter(
    command: Command,
    context: FireMessage | ApplicationCommandMessage
  ) {
    if (!(command instanceof Command)) return false;
    else if (command.hidden && !context.author.isSuperuser()) return false;
    else if (command.ownerOnly && this.client.ownerID != context.author.id)
      return false;
    else if (command.superuserOnly && !context.author.isSuperuser())
      return false;
    else if (
      command.moderatorOnly &&
      !context.member?.isModerator(context.channel)
    )
      return false;
    else if (
      command.guilds.length &&
      !command.guilds.includes(context.guild?.id)
    )
      return false;
    else if (command.channel == "guild" && !context.guild) return false;
    else if (command.userPermissions?.length && !context.guild) return false;
    else if (
      command.userPermissions?.length &&
      (context.channel as GuildChannel)
        .permissionsFor(context.member ?? context.author)
        .missing(command.userPermissions).length
    )
      return false;
    else if (command.group && command.slashOnly) return false;
    return true;
  }

  isSuperuser(user: Snowflake) {
    return (
      this.client.users.cache.has(user)
        ? (this.client.users.cache.get(user) as FireUser).settings
        : new UserSettings(this.client, user)
    ).get<boolean>("utils.superuser", false);
  }

  userHasExperiment(
    user: Snowflake,
    id: number,
    bucket: number | number[]
  ): boolean {
    // if (this.client.config.dev) return true;
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user") return false;
    if (!experiment.active) return true;
    if (Array.isArray(bucket))
      return bucket
        .map((b) => this.userHasExperiment(user, id, b))
        .some((hasexp) => !!hasexp);
    if (bucket == 0)
      return experiment.buckets
        .slice(1)
        .map((b) => this.userHasExperiment(user, id, b))
        .every((hasexp) => hasexp == false);
    if (!!experiment.data.find(([i, b]) => i == user && b == bucket))
      // override
      return true;
    else if (!!experiment.data.find(([i, b]) => i == user && b != bucket))
      // override for another bucket, stop here and ignore filters
      return false;
    const filters = experiment.filters.find(
      (filter) => filter.bucket == bucket
    );
    if (!filters) return false;
    if (
      typeof filters.min_range == "number" &&
      murmur3(`${experiment.id}:${user}`) % 1e4 < filters.min_range
    )
      return false;
    if (
      typeof filters.max_range == "number" &&
      murmur3(`${experiment.id}:${user}`) % 1e4 >= filters.max_range
    )
      return false;
    if (
      typeof filters.min_id == "string" &&
      BigInt(user) < BigInt(filters.min_id)
    )
      return false;
    if (
      typeof filters.max_id == "string" &&
      BigInt(user) >= BigInt(filters.max_id)
    )
      return false;
    return true;
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

    // If a user is timed out, they should not be allowed interact
    // so we act as though they're blacklisted

    // Unsure whether or not users being able to interact with bots is intentional
    // but it is apparently going to be changed so this may be a temporary thing
    if (user instanceof FireMember && user.communicationDisabledUntilTimestamp)
      return true;

    // convert user/member to id
    if (user instanceof FireMember || user instanceof FireUser) user = user.id;

    // global blacklist
    if (this.plonked.includes(user)) return true;

    // guild blacklist
    if (guild?.settings.get<string[]>("utils.plonked", []).includes(user))
      return true;

    if (guild?.hasExperiment(436359108, 1)) return true;

    if (guild?.ownerId && this.userHasExperiment(guild.ownerId, 1521321135, 1))
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

  async getYouTubeVideo(ids: string[]) {
    if (!process.env.YOUTUBE_KEY) return false;
    const videoReq = await centra(
      `https://www.googleapis.com/youtube/v3/videos`
    )
      .header("User-Agent", this.client.manager.ua)
      .query("key", process.env.YOUTUBE_KEY)
      .query("id", ids.join(","))
      .query("part", "snippet,contentDetails,statistics,liveStreamingDetails")
      .send();
    if (videoReq.statusCode != 200) return false;
    const video: Video = await videoReq.json();
    return video;
  }

  async getYouTubeChannel(id: string) {
    if (!process.env.YOUTUBE_KEY) return false;
    let typeQueryParam: string;
    if (id.startsWith("UC")) typeQueryParam = "id";
    else if (id.startsWith("@")) typeQueryParam = "forHandle";
    else typeQueryParam = "forUsername";
    const channelReq = await centra(
      `https://www.googleapis.com/youtube/v3/channels`
    )
      .header("User-Agent", this.client.manager.ua)
      .query("key", process.env.YOUTUBE_KEY)
      .query(typeQueryParam, id)
      .query("part", "snippet,statistics")
      .send();
    if (channelReq.statusCode != 200) return false;
    const channel: Channel = await channelReq.json();
    return channel;
  }

  async getYouTubeChannels(ids: string[]) {
    if (!process.env.YOUTUBE_KEY) return false;
    ids = ids.filter((id) => id.startsWith("UC"));
    const channelReq = await centra(
      `https://www.googleapis.com/youtube/v3/channels`
    )
      .header("User-Agent", this.client.manager.ua)
      .query("key", process.env.YOUTUBE_KEY)
      .query("id", ids.join(","))
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
    if (
      !destination
        .permissionsFor(destination.guild.members.me)
        .has(PermissionFlagsBits.ManageWebhooks)
    )
      return;
    const hooks = await destination.fetchWebhooks().catch(() => {});
    let hook: Webhook;
    if (hooks) hook = hooks.filter((hook) => !!hook.token).first();
    if (!hook) {
      hook = await destination
        .createWebhook(`Fire Quotes #${destination.name}`.slice(0, 80), {
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

  isEmbedEmpty(embed: MessageEmbed) {
    return (
      !embed.title &&
      !embed.description &&
      !embed.url &&
      !embed.timestamp &&
      !embed.footer?.text &&
      !embed.footer?.iconURL &&
      !embed.image?.url &&
      !embed.thumbnail?.url &&
      !embed.author?.name &&
      !embed.author?.url &&
      !embed.fields?.length
    );
  }

  async getSlashUpsellEmbed(message: FireMessage) {
    if (
      !message.hasExperiment(3144709624, 1) ||
      message.hasExperiment(93659956, 1)
    )
      return false;
    else if (!(message instanceof FireMessage)) return false;
    else if (message.sentUpsell) return false; // we don't want to send two of them for the same message

    const parsedCommand = message.util?.parsed?.command;
    const canInvite = message.member?.permissions.has(
      PermissionFlagsBits.ManageGuild
    );
    const mention = parsedCommand?.getSlashCommandMention(message.guild);
    if (mention == null) return false;
    else if (mention.includes("null")) return false;
    const upsellEmbed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setAuthor({
        name: message.language.get("NOTICE_TITLE"),
        iconURL: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
      })
      .setDescription(
        message.language.get(
          !!parsedCommand
            ? "COMMAND_NOTICE_SLASH_SWITCH_WITH_NAME"
            : "COMMAND_NOTICE_SLASH_SWITCH",
          {
            cmd: mention,
            components: message.guild
              ? [
                  new MessageActionRow().addComponents(
                    new MessageButton()
                      .setStyle("LINK")
                      .setLabel(
                        message.language.get(
                          canInvite
                            ? "SLASH_COMMAND_INVITE_BUTTON"
                            : "SLASH_COMMAND_INVITE_BUTTON_NO_PERMISSIONS"
                        )
                      )
                      .setURL(
                        this.client.config.commandsInvite(
                          this.client,
                          message.guild?.id ?? ""
                        )
                      )
                  ),
                ]
              : [],
          }
        )
      );
    message.sentUpsell = true;
    return upsellEmbed;
  }

  async createSpecialCoupon(
    member: FireMember
  ): Promise<SpecialCouponCreateResponse> {
    const code = this.getSpecialCouponEligibility(member);
    if (!code) return { success: false, reason: "DISCOUNT_INELIGIBLE" };
    return new Promise((resolve) => {
      const nonce = SnowflakeUtil.generate();
      this.client.manager.ws.handlers.set(nonce, resolve);
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.SPECIAL_COUPON,
            { action: "create", user: member.id, code },
            nonce
          )
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.client.manager.ws.handlers.has(nonce)) {
          this.client.manager.ws.handlers.delete(nonce);
          resolve({ success: false, reason: "COMMAND_ERROR_500" });
        }
      }, 30000);
    });
  }

  async deleteSpecialCoupon(
    user: FireUser | FireMember
  ): Promise<SpecialCouponDeleteResponse> {
    return new Promise((resolve) => {
      const nonce = SnowflakeUtil.generate();
      this.client.manager.ws.handlers.set(nonce, resolve);
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.SPECIAL_COUPON,
            { action: "remove", user: user.id },
            nonce
          )
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.client.manager.ws.handlers.has(nonce)) {
          this.client.manager.ws.handlers.delete(nonce);
          resolve({ success: false, reason: "internal_server_error" });
        }
      }, 30000);
    });
  }

  async updateSpecialCoupon(
    member: FireMember
  ): Promise<SpecialCouponUpdateResponse> {
    const code = this.getSpecialCouponEligibility(member);
    if (!code) return { success: false, reason: "DISCOUNT_INELIGIBLE" };
    const current = member.settings.get<CouponType>("premium.coupon");
    if (current == code)
      return { success: false, reason: "DISCOUNT_UNCHANGED" };
    return new Promise((resolve) => {
      const nonce = SnowflakeUtil.generate();
      this.client.manager.ws.handlers.set(nonce, resolve);
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.SPECIAL_COUPON,
            { action: "update", user: member.id, code },
            nonce
          )
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.client.manager.ws.handlers.has(nonce)) {
          this.client.manager.ws.handlers.delete(nonce);
          resolve({ success: false, reason: "internal_server_error" });
        }
      }, 30000);
    });
  }

  getSpecialCouponEligibility(member: FireMember) {
    if (member.guild?.id != this.client.config.fireGuildId) return null;
    const roles = member.roles.cache;
    if (roles.has("620512846232551427") && roles.has("745392985151111338"))
      return CouponType.BOOSTER_AND_SUB;
    else if (roles.has("620512846232551427")) return CouponType.BOOSTER;
    else if (roles.has("745392985151111338")) return CouponType.TWITCHSUB;
    else if (roles.has("564061443448766464")) return CouponType.MEMBER;
  }

  isValidPasteURL(url: PasteURL) {
    return validPasteURLs.includes(url);
  }

  getRawPasteURL(url: string | URL) {
    try {
      if (typeof url == "string") url = new URL(url);
    } catch {
      return null;
    }
    const hostname = url.hostname as PasteURL;
    if (!this.isValidPasteURL(hostname)) return null;
    switch (hostname) {
      case "h.inv.wtf":
      case "hst.sh":
      case "paste.essential.gg":
      case "pastebin.com": {
        if (!url.pathname.includes("/raw/"))
          url.pathname = `/raw${url.pathname}`;
        break;
      }
      case "paste.ee":
      case "api.paste.ee": {
        if (url.pathname.startsWith("/p/"))
          url.pathname = `/r/${url.pathname.slice(3)}`;
        break;
      }
      case "mclo.gs":
      case "api.mclo.gs": {
        if (!url.hostname.includes("api")) url.hostname = `api.${url.hostname}`;
        if (!url.pathname.startsWith("/1/raw/"))
          url.pathname = `/1/raw${url.pathname}`;
        break;
      }
      case "github.com": {
        const split = url.pathname.split("/");
        if (url.pathname.includes("/blob/"))
          (url.hostname = "raw.githubusercontent.com"),
            (url.pathname = `/${split[1]}/${split[2]}/${split[4]}/${split[5]}`);
        else if (!url.pathname.includes("/files/")) url = null;
        break;
      }
    }
    return url as URL;
  }

  async getPasteContent<S extends boolean = false>(
    url: URL,
    stream?: S
  ): Promise<S extends true ? Readable : string> {
    const rawURL = this.getRawPasteURL(url);
    if (!rawURL) return null;
    this.client.console.debug(`[Paste] Fetching ${rawURL}`);
    const req = centra(rawURL).header("User-Agent", this.client.manager.ua);
    if (stream) req.stream();
    const res = await req.send();
    if (
      res.statusCode == 301 ||
      res.statusCode == 302 ||
      res.statusCode == 307 ||
      res.statusCode == 308
    )
      return await this.getPasteContent(
        new URL(res.headers["location"]),
        stream
      );
    else if (res.statusCode != 200) return null;
    return (stream ? (res as unknown as Readable) : await res.text()) as any;
  }
}
