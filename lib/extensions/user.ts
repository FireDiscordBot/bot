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
}

Structures.extend("User", () => FireUser);
