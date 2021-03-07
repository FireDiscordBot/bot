import { MessageEmbed, Structures, User, Util } from "discord.js";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { UserSettings } from "@fire/lib/util/settings";
import { FireTextChannel} from "./textchannel";
import { Message } from "@fire/lib/ws/Message";
import { FireMember } from "./guildmember";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "./guild";

export class FireUser extends User {
  settings: UserSettings;
  client: Fire;

  constructor(client: Fire, data: object) {
    super(client, data);
    this.settings = new UserSettings(this.client, this);
  }

  get language() {
    return this.client.getLanguage(
      this.settings.get("utils.language", "en-US")
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

  hasExperiment(id: string, treatmentId?: number) {
    if (this.client.config.dev) return true;
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user") return false;
    for (const c of Object.keys(experiment.defaultConfig)) {
      if (!this.settings.has(c))
        this.settings.set(c, experiment.defaultConfig[c]);
    }
    if (treatmentId != undefined) {
      const treatment = experiment.treatments.find((t) => t.id == treatmentId);
      if (!treatment) return false;
      return Object.keys(treatment.config).every(
        (c) =>
          this.settings.get(c, experiment.defaultConfig[c] || null) ==
          treatment.config[c]
      );
    } else
      return experiment.treatments.some((treatment) =>
        Object.keys(treatment.config).every(
          (c) => this.settings.get(c, null) == treatment.config[c]
        )
      );
  }

  giveExperiment(id: string, treatmentId: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user")
      throw new Error("Experiment is not a user experiment");
    const treatment = experiment.treatments.find((t) => t.id == treatmentId);
    if (!treatment) throw new Error("Invalid Treatment ID");
    Object.keys(experiment.defaultConfig).forEach(
      // Set to default before applying treatment changes
      (c) => this.settings.set(c, experiment.defaultConfig[c])
    );
    Object.keys(treatment.config).forEach((c) =>
      this.settings.set(c, treatment.config[c])
    );
    return this.hasExperiment(id, treatmentId);
  }

  removeExperiment(id: string) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "user")
      throw new Error("Experiment is not a user experiment");
    Object.keys(experiment.defaultConfig).forEach((c) =>
      this.settings.set(c, experiment.defaultConfig[c])
    );
    return this.hasExperiment(id);
  }

  get hoisted() {
    return this.username[0] < "0";
  }

  get cancerous() {
    return !this.client.util.isASCII(this.username);
  }

  isSuperuser() {
    return this.settings.get("utils.superuser", false);
  }

  async createReminder(when: Date, why: string, link: string) {
    if (!this.client.manager.ws?.open) return this.client.config.dev;
    const timestamp = +when;
    const reminder = await this.client.db
      .query(
        "INSERT INTO remind (uid, forwhen, reminder, link) VALUES ($1, $2, $3, $4);",
        [this.id, timestamp, why, link]
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
      .ban(this, { reason, days })
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
        guild.language.get("BAN_LOG_AUTHOR", this.toString()),
        this.avatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(guild.language.get("MODERATOR"), moderator.toString())
      .addField(guild.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await guild.modLog(embed, "ban").catch(() => {});
    if (channel)
      return await channel
        .send(
          guild.language.get(
            "BAN_SUCCESS",
            Util.escapeMarkdown(this.toString()),
            Util.escapeMarkdown(guild.name)
          )
        )
        .catch(() => {});
  }
}

Structures.extend("User", () => FireUser);
