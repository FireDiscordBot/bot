import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { CategoryChannel, Snowflake } from "discord.js";
import { DiscoveryUpdateOp } from "../interfaces/stats";

export class GuildSettings {
  guild: Snowflake | FireGuild;
  client: Fire;

  constructor(client: Fire, guild: Snowflake | FireGuild) {
    this.client = client;
    this.guild = guild;
    if (
      this.shouldMigrate &&
      !this.get(`settings.migration.${this.migrationId}`, false)
    )
      this.client.waitUntilReady().then(() =>
        this.runMigration().then(() => {
          this.set(`settings.migration.${this.migrationId}`, true);
          this.client.console.log(
            `[GuildSettings] Migration complete for`,
            this.guild instanceof FireGuild && this.guild.name
              ? this.guild.name
              : this.guild,
            `${
              this.guild instanceof FireGuild ? "(" + this.guild.id + ")" : ""
            }`
          );
        })
      );
    else
      this.client.guildSettings.toMigrate =
        this.client.guildSettings.toMigrate.filter(
          (id) =>
            id != (this.guild instanceof FireGuild ? this.guild.id : this.guild)
        );
  }

  // will check if migration is needed for the current migration script
  get shouldMigrate() {
    return this.has("logging.action.flags");
  }

  // unique identifier for the migration script
  get migrationId() {
    return "June24-new-action-log-flags";
  }

  // will be empty unless there's a migration to run
  async runMigration() {
    let currentFlags = this.get<number>("logging.action.flags");
    if ((currentFlags & (1 << 15)) != 1 << 15) currentFlags |= 1 << 15;
    if ((currentFlags & (1 << 16)) != 1 << 16) currentFlags |= 1 << 16;
    this.set("logging.action.flags", currentFlags);
  }

  has(option: string) {
    const guild = this.guild instanceof FireGuild ? this.guild.id : this.guild;
    return (
      this.client.guildSettings.items.has(guild) &&
      Object.keys(this.client.guildSettings.items.get(guild)).includes(option)
    );
  }

  get<T>(option: string, defaultValue: T = null): T | null {
    return this.client.guildSettings.get<T>(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      defaultValue
    );
  }

  set<T>(option: string, value: T = null) {
    const set = this.client.guildSettings.set<T>(
      this.guild instanceof FireGuild ? this.guild.id : this.guild,
      option,
      value
    );

    if (option == "utils.featured" && this.guild instanceof FireGuild)
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.SYNC,
            guilds: [this.guild.getDiscoverableData()],
          })
        )
      );

    if (option == "utils.public" && this.guild instanceof FireGuild)
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: this.guild.isPublic()
              ? DiscoveryUpdateOp.ADD_OR_SYNC
              : DiscoveryUpdateOp.REMOVE,
            guilds: [this.guild.getDiscoverableData()],
          })
        )
      );

    return set;
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
  user: Snowflake | FireUser;
  client: Fire;

  constructor(client: Fire, user: Snowflake | FireUser) {
    this.client = client;
    this.user = user;
    if (this.shouldMigrate)
      this.runMigration().then(() =>
        this.client.console.log(
          `[GuildSettings] Migration complete for`,
          this.user instanceof FireUser ? this.user.toString() : this.user,
          `${this.user instanceof FireUser ? "(" + this.user.id + ")" : ""}`
        )
      );
    else
      this.client.userSettings.toMigrate =
        this.client.userSettings.toMigrate.filter(
          (id) =>
            id != (this.user instanceof FireUser ? this.user.id : this.user)
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

  get<T>(option: string, defaultValue: T = null): T | null {
    return this.client.userSettings.get<T>(
      this.user instanceof FireUser ? this.user.id : this.user,
      option,
      defaultValue
    );
  }

  set<T>(option: string, value: T = null) {
    const result = this.client.userSettings.set<T>(
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
