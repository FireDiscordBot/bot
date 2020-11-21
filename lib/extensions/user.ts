import { UserSettings } from "../util/settings";
import { Structures, User } from "discord.js";
import { Language } from "../util/language";
import { Fire } from "../Fire";

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
    for (const c in Object.keys(experiment.defaultConfig)) {
      if (!this.settings.has(c))
        this.settings.set(c, experiment.defaultConfig[c]);
    }
    if (treatmentId != undefined) {
      const treatment = experiment.treatments.find((t) => t.id == treatmentId);
      if (!treatment) return false;
      return Object.keys(treatment.config).every((c) => {
        this.settings.get(c, experiment.defaultConfig[c] || null) ==
          treatment.config[c];
      });
    } else
      return experiment.treatments.some((treatment) =>
        Object.keys(treatment.config).every((c) => {
          this.settings.get(c, null) == treatment.config[c];
        })
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
}

Structures.extend("User", () => FireUser);
