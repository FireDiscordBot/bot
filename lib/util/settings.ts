import { FireGuild } from "../extensions/guild";
import { Fire } from "../Fire";

export class Settings {
  client: Fire;
  guild: string | FireGuild;

  constructor(client: Fire, guild: string | FireGuild) {
    this.client = client;
    this.guild = guild;
  }

  get(option: string, defaultValue: any = null) {
    return this.client.settings.get(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      defaultValue
    );
  }

  set(option: string, value: any = null) {
    return this.client.settings.set(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      value
    );
  }

  delete(option: string) {
    return this.client.settings.delete(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option
    );
  }
}
