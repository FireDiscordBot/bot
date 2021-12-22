import { MessageEmbed, UserMention, Structures, User, Util } from "discord.js";
import { RawUserData } from "discord.js/typings/rawDataTypes";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { UserSettings } from "@fire/lib/util/settings";
import { BaseFakeChannel } from "../interfaces/misc";
import { FireTextChannel } from "./textchannel";
import { Message } from "@fire/lib/ws/Message";
import { FireMember } from "./guildmember";
import { murmur3 } from "murmurhash-js";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";

type Primitive = string | boolean | number | null;

export class FireUser extends User {
  settings: UserSettings;
  declare client: Fire;

  constructor(client: Fire, data: RawUserData) {
    super(client, data);
    this.settings = new UserSettings(this.client, this);
  }

  get language() {
    return (
      this.client.getLanguage(
        this.settings.get<string>("utils.language", "en-US")
      ) ?? this.client.getLanguage("en-US")
    );
  }

  get premium() {
    return [...this.client.util.premium.values()].filter(
      (data) => data.user == this.id
    ).length;
  }

  toString() {
    return (`${this.username}#${this.discriminator}` as unknown) as UserMention;
  }

  toMention() {
    return super.toString();
  }

  async blacklist(reason: string) {
    return await this.client.util.blacklist(this, reason);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }

  hasExperiment(id: number, bucket: number | number[]): boolean {
    // if (this.client.config.dev) return true;
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user") return false;
    if (!experiment.active) return true;
    if (Array.isArray(bucket))
      return bucket
        .map((b) => this.hasExperiment(id, b))
        .some((hasexp) => !!hasexp);
    if (bucket == 0)
      return experiment.buckets
        .slice(1)
        .map((b) => this.hasExperiment(id, b))
        .every((hasexp) => hasexp == false);
    if (!!experiment.data.find(([i, b]) => i == this.id && b == bucket))
      // override
      return true;
    else if (!!experiment.data.find(([i, b]) => i == this.id && b != bucket))
      // override for another bucket, stop here and ignore filters
      return false;
    let hasExperiment: boolean | number = 1;
    const filters = experiment.filters.find(
      (filter) => filter.bucket == bucket
    );
    if (!filters) return false;
    if (
      typeof filters.min_range == "number" &&
      murmur3(`${experiment.id}:${this.id}`) % 1e4 < filters.min_range
    )
      return false;
    if (
      typeof filters.max_range == "number" &&
      murmur3(`${experiment.id}:${this.id}`) % 1e4 >= filters.max_range
    )
      return false;
    if (
      typeof filters.min_id == "string" &&
      BigInt(this.id) < BigInt(filters.min_id)
    )
      return false;
    if (
      typeof filters.max_id == "string" &&
      BigInt(this.id) >= BigInt(filters.max_id)
    )
      return false;
    return true;
  }

  async giveExperiment(id: number, bucket: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user")
      throw new Error("Experiment is not a user experiment");
    if (!experiment.buckets.includes(bucket)) throw new Error("Invalid Bucket");
    experiment.data = experiment.data.filter(([i]) => i != this.id);
    experiment.data.push([this.id, bucket]);
    await this.client.db.query("UPDATE experiments SET data=$1 WHERE id=$2;", [
      experiment.data?.length ? experiment.data : null,
      BigInt(experiment.hash),
    ]);
    this.client.experiments.set(experiment.hash, experiment);
    this.client.refreshExperiments([experiment]);
    return this.hasExperiment(id, bucket);
  }

  async removeExperiment(id: number, bucket: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user")
      throw new Error("Experiment is not a user experiment");
    const b = experiment.data.length;
    experiment.data = experiment.data.filter(
      ([i, b]) => i != this.id && b != bucket
    );
    if (b == experiment.data.length) return !this.hasExperiment(id, bucket);
    await this.client.db.query("UPDATE experiments SET data=$1 WHERE id=$2;", [
      experiment.data?.length ? experiment.data : null,
      BigInt(experiment.hash),
    ]);
    this.client.experiments.set(experiment.hash, experiment);
    this.client.refreshExperiments([experiment]);
    return !this.hasExperiment(id, bucket);
  }

  get hoisted() {
    return this.username[0] < "0";
  }

  get cancerous() {
    return !this.client.util.isASCII(this.username);
  }

  isSuperuser() {
    return this.client.util.isSuperuser(this.id);
  }

  async createReminder(when: Date, why: string, link: string) {
    if (!this.client.manager.ws?.open)
      return process.env.NODE_ENV == "development";
    const timestamp = +when;
    if (isNaN(timestamp) || timestamp < +new Date() + 60000) return false;
    const reminder = await this.client.db
      .query(
        "INSERT INTO remind (uid, forwhen, reminder, link) VALUES ($1, $2, $3, $4);",
        [this.id, when, why, link]
      )
      .catch(() => {});
    if (!reminder) return false;
    this.client.manager?.ws.send(
      MessageUtil.encode(
        new Message(EventType.REMINDER_CREATE, {
          user: this.id,
          text: why,
          link,
          timestamp,
        })
      )
    );
    return true;
  }

  async deleteReminder(timestamp: number) {
    this.client.console.warn(
      `[Reminders] Deleting reminder for user ${this} with timestamp ${timestamp}`
    );
    const deleted = await this.client.db
      .query("DELETE FROM remind WHERE uid=$1 AND forwhen=$2;", [
        this.id,
        new Date(timestamp),
      ])
      .catch(() => false);
    if (typeof deleted == "boolean" && !deleted) return false;
    this.client.manager?.ws.send(
      MessageUtil.encode(
        new Message(EventType.REMINDER_DELETE, {
          user: this.id,
          timestamp,
        })
      )
    );
    return true;
  }

  async bean(
    guild: FireGuild,
    reason: string,
    moderator: FireMember,
    days: number = 0,
    channel?: FireTextChannel
  ) {
    if (!guild || !reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const already = await guild.bans.fetch(this).catch(() => {});
    if (already) return "already";
    const logEntry = await guild
      .createModLogEntry(this, moderator, "ban", reason)
      .catch(() => {});
    if (!logEntry) return "entry";
    const banned = await guild.members
      .ban(this, {
        reason: `${moderator} | ${reason}`,
        days,
      })
      .catch(() => {});
    if (!banned) {
      const deleted = await guild
        .deleteModLogEntry(logEntry)
        .catch(() => false);
      return deleted ? "ban" : "ban_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp()
      .setAuthor({
        name: guild.language.get("BAN_LOG_AUTHOR", { user: this.toString() }),
        iconURL: this.avatarURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addField(guild.language.get("MODERATOR"), moderator.toString())
      .addField(guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await guild.modLog(embed, "ban").catch(() => {});
    if (channel)
      return await channel
        .send({
          content:
            guild.language.getSuccess("BAN_SUCCESS", {
              user: Util.escapeMarkdown(this.toString()),
              guild: Util.escapeMarkdown(guild.name),
            }) +
            (this.id == "159985870458322944"
              ? "\nhttps://tenor.com/view/star-wars-death-star-explosion-explode-gif-17964336"
              : ""),
          embeds:
            channel instanceof BaseFakeChannel ||
            moderator.id == this.client.user?.id
              ? []
              : this.client.util.getModCommandSlashWarning(guild),
        })
        .catch(() => {});
  }
}

Structures.extend("User", () => FireUser);
// hack of the century
const clientUserCacheKey = Object.keys(require.cache).find((key) =>
  key.includes("ClientUser")
);
delete require.cache[clientUserCacheKey];
