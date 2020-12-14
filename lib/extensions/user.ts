import { UserSettings } from "../util/settings";
import { Structures, User } from "discord.js";
import { Language } from "../util/language";
import { Fire } from "../Fire";
import { MessageUtil } from "../ws/util/MessageUtil";
import { Message } from "../ws/Message";
import { EventType } from "../ws/util/constants";

export class FireUser extends User {
  client: Fire;
  settings: UserSettings;
  language: Language;

  constructor(client: Fire, data: object) {
    super(client, data);
    this.settings = new UserSettings(this.client, this);
    this.language = client.getLanguage(
      this.settings.get("utils.language", "en-US")
    );
  }

  toString() {
    return `${this.username}#${this.discriminator}`;
  }

  toMention() {
    return super.toString();
  }

  async blacklist(reason: string, permanent: boolean) {
    return await this.client.util.blacklist(this, reason, permanent);
  }

  async unblacklist() {
    return await this.client.util.unblacklist(this);
  }

  hasExperiment(id: string, treatmentId?: number) {
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
    if (!this.client.manager.ws) return false;
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
}

Structures.extend("User", () => FireUser);
