import { FireMember } from "../extensions/guildmember";
import { FireMessage } from "../extensions/message";
import { describe, ProcessDescription } from "pm2";
import { FireGuild } from "../extensions/guild";
import { version as djsver } from "discord.js";
import { FireUser } from "../extensions/user";
import { ClientUtil } from "discord-akairo";
import { getCommitHash } from "./gitUtils";
import { humanize } from "./constants";
import { promisify } from "util";
import * as Centra from "centra";
import * as moment from "moment";
import { Fire } from "../Fire";
import * as pm2 from "pm2";

const describePromise = promisify(describe.bind(pm2));

const humanFileSize = (size: number) => {
  let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    Number((size / Math.pow(1024, i)).toFixed(2)) * 1 +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
};

interface MojangProfile {
  name: string;
  id: string;
}

export class Util extends ClientUtil {
  client: Fire;
  admins: string[];
  loadedData: { plonked: boolean; premium: boolean };
  plonked: string[];
  premium: Map<string, string>;
  uuidCache: Map<string, string>;

  constructor(client: Fire) {
    super(client);
    this.admins = JSON.parse(process.env.ADMINS); // Will probably change this for a table in le database
    this.loadedData = { plonked: false, premium: false };
    this.plonked = [];
    this.premium = new Map();
    this.uuidCache = new Map();
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isPromise(value: any) {
    return value && typeof value.then == "function";
  }

  shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async haste(text: string, fallback = false) {
    const url = fallback ? "https://h.inv.wtf/" : "https://hst.sh/";
    try {
      const h: { key: string } = await (
        await Centra(url, "POST")
          .path("/documents")
          .body(text, "buffer")
          .header("User-Agent", "Fire Discord Bot")
          .send()
      ).json();
      return url + h.key;
    } catch {
      return await this.haste(text, true);
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

  async getClusterStats() {
    let processInfo: ProcessDescription[] = [];
    if (this.client.manager.pm2) {
      try {
        processInfo = await describePromise(process.env.pm_id || "fire");
      } catch {}
    }
    const now = moment();
    const duration = this.client.launchTime.diff(now);
    return {
      id: this.client.manager.id,
      env: this.client.config.dev ? "dev" : "prod",
      user: this.client.user.toString(),
      userId: this.client.user.id,
      started: this.client.launchTime.toISOString(true),
      uptime: humanize(duration, "en"),
      cpu: processInfo.length ? `${processInfo[0].monit.cpu}%` : "Unknown%",
      ram: processInfo.length
        ? humanFileSize(processInfo[0].monit.memory)
        : "Unknown MB",
      pid: process.pid,
      version: this.client.config.dev ? "dev" : getCommitHash().slice(0, 7),
      versions: `Discord.JS v${djsver} | Node.JS ${process.version}`,
      guilds: this.client.guilds.cache.size,
      unavailableGuilds: this.client.guilds.cache.filter(
        (guild) => !guild.available
      ).size,
      users:
        this.client.guilds.cache.size >= 1
          ? this.client.guilds.cache
              .map((guild) => guild.memberCount)
              .reduce((a, b) => a + b)
          : 0,
      commands: this.client.commandHandler.modules.size,
      shards: [...this.client.ws.shards.values()].map((shard) => {
        return {
          id: shard.id,
          wsPing: shard.ping,
          guilds: this.client.guilds.cache.filter(
            (guild) => guild.shardID == shard.id
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
                  .map((guild) => guild.memberCount)
                  .reduce((a, b) => a + b)
              : 0,
          publicGuilds: this.client.guilds.cache
            .filter(
              (guild: FireGuild) =>
                guild.shardID == shard.id && guild.isPublic()
            )
            .map((guild) => guild.id),
          discoverableGuilds: (this.client.guilds.cache
            .filter(
              (guild: FireGuild) =>
                guild.shardID == shard.id && guild.isPublic()
            )
            .array() as FireGuild[]).map((guild) =>
            guild.getDiscoverableData()
          ),
        };
      }),
    };
  }

  async blacklist(
    user: FireMember | FireUser,
    reason: string,
    permanent: boolean
  ) {
    try {
      if (this.client.util.plonked.includes(user.id))
        await this.updateBlacklist(user, reason, permanent);
      else await this.insertBlacklist(user, reason, permanent);
      return true;
    } catch {
      return false;
    }
  }

  async unblacklist(user: FireMember | FireUser) {
    try {
      await this.deleteBlacklist(user);
      return true;
    } catch {
      return false;
    }
  }

  private async insertBlacklist(
    user: FireMember | FireUser,
    reason: string,
    permanent: boolean
  ) {
    const username =
      user instanceof FireMember ? user.user.username : user.username;
    await this.client.db.query(
      'INSERT INTO blacklist ("user", uid, reason, perm) VALUES ($1, $2, $3, $4);',
      [username, user.id, reason, permanent]
    );
    this.client.util.plonked.push(user.id);
    this.client.console.warn(`[Blacklist] Successfully blacklisted ${user}`);
  }

  private async updateBlacklist(
    user: FireMember | FireUser,
    reason: string,
    permanent: boolean
  ) {
    const username =
      user instanceof FireMember ? user.user.username : user.username;
    await this.client.db.query(
      "UPDATE blacklist user=$1, reason=$2, perm=$3 WHERE uid=$4;",
      [username, reason, permanent, user.id]
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
        splitPhrase = phrase.replace(", ", ",").split(",");
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
}
