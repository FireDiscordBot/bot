import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Message } from "@fire/lib/ws/Message";
import { Fire } from "@fire/lib/Fire";
import * as pEvent from "p-event";

export class GuildSettings {
  guild: string | FireGuild;
  client: Fire;

  constructor(client: Fire, guild: string | FireGuild) {
    this.client = client;
    this.guild = guild;
    if (this.shouldMigrate) this.runMigration();
    else
      this.client.guildSettings.toMigrate = this.client.guildSettings.toMigrate.filter(
        (id) =>
          id != (this.guild instanceof FireGuild ? this.guild.id : this.guild)
      );
  }

  // will check if migration is needed for the current migration script
  get shouldMigrate() {
    return false;
  }

  // will be empty unless there's a migration to run
  async runMigration() {}

  has(option: string) {
    const guild = this.guild instanceof FireGuild ? this.guild.id : this.guild;
    return (
      this.client.guildSettings.items.has(guild) &&
      Object.keys(this.client.guildSettings.items.get(guild)).includes(option)
    );
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
    if (!this.has(option)) return true;
    return this.client.guildSettings.delete(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option
    );
  }
}

export class UserSettings {
  user: string | FireUser;
  client: Fire;

  constructor(client: Fire, user: string | FireUser) {
    this.client = client;
    this.user = user;
    if (this.shouldMigrate) this.runMigration();
    else
      this.client.userSettings.toMigrate = this.client.userSettings.toMigrate.filter(
        (id) => id != (this.user instanceof FireUser ? this.user.id : this.user)
      );
  }

  // will check if migration is needed for the current migration script
  get shouldMigrate() {
    return false;
  }

  // will be empty unless there's a migration to run
  async runMigration() {}

  has(option: string) {
    const user = this.user instanceof FireUser ? this.user.id : this.user;
    return (
      this.client.userSettings.items.has(user) &&
      Object.keys(this.client.userSettings.items.get(user)).includes(option)
    );
  }

  get(option: string, defaultValue: any = null) {
    return this.client.userSettings.get(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      defaultValue
    );
  }

  set(option: string, value: any = null) {
    const result = this.client.userSettings.set(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      value
    );
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.SETTINGS_SYNC, {
          id: this.client.manager.id,
          user: this.user instanceof FireUser ? this.user.id : this.user,
          setting: option,
          value,
        })
      )
    );
    return result;
  }

  delete(option: string) {
    if (!this.has(option)) return true;
    const result = this.client.userSettings.delete(
      this.user instanceof FireUser ? this.user.id : this.user,
      option
    );
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.SETTINGS_SYNC, {
          id: this.client.manager.id,
          user: this.user instanceof FireUser ? this.user.id : this.user,
          setting: option,
          value: "deleteSetting",
        })
      )
    );
    return result;
  }
}
