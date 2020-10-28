import { FireGuild } from "../extensions/guild";
import { FireUser } from "../extensions/user";
import { Fire } from "../Fire";

export class GuildSettings {
  client: Fire;
  guild: string | FireGuild;

  constructor(client: Fire, guild: string | FireGuild) {
    this.client = client;
    this.guild = guild;
  }

  get(option: string, defaultValue: any = null) {
    return this.client.guildSettings.get(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      defaultValue
    );
  }

  set(option: string, value: any = null) {
    return this.client.guildSettings.set(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      value
    );
  }

  delete(option: string) {
    return this.client.guildSettings.delete(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option
    );
  }
}

export class UserSettings {
  client: Fire;
  user: FireUser;

  constructor(client: Fire, user: FireUser) {
    this.client = client;
    this.user = user;
  }

  get(option: string, defaultValue: any = null) {
    return this.client.guildSettings.get(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      defaultValue
    );
  }

  set(option: string, value: any = null) {
    return this.client.guildSettings.set(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      value
    );
  }

  delete(option: string) {
    return this.client.guildSettings.delete(
      this.user instanceof FireUser ? this.user.id : this.user,
      option
    );
  }
}
