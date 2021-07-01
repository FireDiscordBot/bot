import { MessageEmbed, Structures, User, Util } from "discord.js";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { UserSettings } from "@fire/lib/util/settings";
import { FireTextChannel } from "./textchannel";
import { Message } from "@fire/lib/ws/Message";
import { FireMember } from "./guildmember";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";

type Primitive = string | boolean | number | null;

export class FireUser extends User {
  settings: UserSettings;
  declare client: Fire;

  constructor(client: Fire, data: object) {
    super(client, data);
    this.settings = new UserSettings(this.client, this);
  }

  get language() {
    return this.client.getLanguage(
      this.settings.get<string>("utils.language", "en-US")
    );
  }

  get premium() {
    return [...this.client.util.premium.values()].filter(
      (data) => data.user == this.id
    ).length;
  }

  toString() {
    return `${this.username}#${this.discriminator}`;
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

  hasExperiment(id: number, bucket: number) {
    // if (this.client.config.dev) return true;
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user") return false;
    if (!experiment.active) return true;
    return !!experiment.data.find(([i, b]) => i == this.id && b == bucket);
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
      BigInt(experiment.id),
    ]);
    this.client.experiments.set(experiment.id, experiment);
    this.client.refreshExperiments();
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
      BigInt(experiment.id),
    ]);
    this.client.experiments.set(experiment.id, experiment);
    this.client.refreshExperiments();
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
    if (!this.client.manager.ws?.open) return this.client.config.dev;
    const timestamp = +when;
    if (isNaN(timestamp) || timestamp < +new Date() + 60000) return false;
    const reminder = await this.client.db
      .query(
        "INSERT INTO remind (uid, forwhen, reminder, link) VALUES ($1, $2, $3, $4);",
        [this.id, timestamp.toString(), why, link]
      )
      .catch(() => {});
    if (!reminder) return false;
    this.client.manager?.ws.send(
      MessageUtil.encode(
        new Message(EventType.REMINDER_CREATE, {
          user: this.id,
          text: why,
          link,
          legacy: false,
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
        timestamp,
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
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
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
      .setAuthor(
        guild.language.get("BAN_LOG_AUTHOR", { user: this.toString() }),
        this.avatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(guild.language.get("MODERATOR"), moderator.toString())
      .addField(guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await guild.modLog(embed, "ban").catch(() => {});
    if (channel)
      return await channel
        .send(
          guild.language.get("BAN_SUCCESS", {
            user: Util.escapeMarkdown(this.toString()),
            guild: Util.escapeMarkdown(guild.name),
          }) +
            (this.id == "159985870458322944"
              ? "\nhttps://tenor.com/view/star-wars-death-star-explosion-explode-gif-17964336"
              : "")
        )
        .catch(() => {});
  }
}

Structures.extend("User", () => FireUser);
