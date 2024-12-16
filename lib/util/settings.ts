import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";
import { SnowflakeUtil } from "discord.js";
import { DiscoveryUpdateOp } from "../interfaces/stats";
import { GuildOrUserConfig, SettingsValueTypes } from "./constants";
import { FireMember } from "../extensions/guildmember";

export class ConfigError extends Error {
  message:
    | "SERVICE_UNAVAILABLE"
    | "UPDATE_SETTINGS_TIMEOUT"
    | "RETRIEVE_SETTINGS_TIMEOUT"; // more can be added in the future
}
type ResolveBoolean = (value: boolean) => void;

enum UpdateSettingsAction {
  SET,
  DELETE,
}

export class GuildSettings {
  guild: Snowflake | FireGuild;
  client: Fire;

  constructor(client: Fire, guild: Snowflake | FireGuild) {
    this.client = client;
    this.guild = guild;
    if (this.unmigrated)
      (async () => {
        await client.waitUntilReady();
        const migrated = await this.runMigration();
        if (!migrated)
          return this.client.console.error(
            `[GuildSettings] Migration "${this.migrationId}" failed for`,
            this.guild instanceof FireGuild && this.guild.name
              ? this.guild.name
              : this.guild,
            `${
              this.guild instanceof FireGuild ? "(" + this.guild.id + ")" : ""
            }`
          );
        const updatedConfig = await this.set(
          `settings.migration.${this.migrationId}`,
          true,
          client.user
        );
        this.client.console.log(
          `[GuildSettings] Migration "${this.migrationId}" complete for`,
          this.guild instanceof FireGuild && this.guild.name
            ? this.guild.name
            : this.guild,
          `${this.guild instanceof FireGuild ? "(" + this.guild.id + ")" : ""}${
            updatedConfig
              ? ""
              : " however adding the migration key to its config failed"
          }`
        );
      })();
  }

  get id() {
    return this.guild instanceof FireGuild ? this.guild.id : this.guild;
  }

  private get data() {
    return this.client.manager.state.guildConfigs[this.id] ?? {};
  }

  // will check if migration is needed for the current migration script
  // must be synchronous so it can be used in the constructor and the getter below
  shouldMigrate() {
    return (
      this.has("utils.badname") &&
      (this.get<string>("utils.badname", "").length > 32 ||
        this.get<string>("utils.badname", "").length < 2)
    );
  }

  // boolean to determine whether the migration has been run (based on the migrationId)
  // if a migration is needed (based on the return value of shouldMigrate)
  get unmigrated() {
    return (
      this.shouldMigrate() &&
      !this.get(`settings.migration.${this.migrationId}`, false)
    );
  }

  // unique identifier for the migration script
  get migrationId() {
    return "December24-badname-length";
  }

  // will be empty unless there's a migration to run
  async runMigration(): Promise<boolean> {
    return await this.delete("utils.badname", this.client.user);
  }

  has(key: string) {
    return key in this.data;
  }

  get<T extends SettingsValueTypes>(option: string, defaultValue: T = null): T {
    return (this.data[option] ?? defaultValue) as T;
  }

  async set<T extends SettingsValueTypes>(
    key: string,
    value: T = null,
    updatedBy: FireUser | FireMember
  ) {
    if (!this.client.manager.ws?.open)
      throw new ConfigError("SERVICE_UNAVAILABLE");

    const updated = await new Promise((resolve: ResolveBoolean, reject) => {
      const nonce = SnowflakeUtil.generate();
      const timeout = setTimeout(() => {
        if (this.client.manager.ws.handlers.has(nonce))
          reject(new ConfigError("UPDATE_SETTINGS_TIMEOUT"));
      }, 60000);
      this.client.manager.ws.handlers.set(
        nonce,
        (data: { success: boolean }) => {
          clearTimeout(timeout);
          if (data.success)
            this.client.manager.state.guildConfigs[this.id][key] = value;
          resolve(data.success);
        }
      );
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.UPDATE_SETTINGS,
            {
              guild: this.id,
              key,
              value,
              action: UpdateSettingsAction.SET,
              updatedBy: updatedBy.id,
            },
            nonce
          )
        )
      );
    });

    if (updated) {
      if (key == "utils.featured" && this.guild instanceof FireGuild)
        this.client.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.DISCOVERY_UPDATE, {
              op: DiscoveryUpdateOp.SYNC,
              guilds: [this.guild.getDiscoverableData()],
            })
          )
        );

      if (key == "utils.public" && this.guild instanceof FireGuild)
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
    }

    return updated;
  }

  async delete(key: string, updatedBy: FireUser | FireMember) {
    if (!this.has(key)) return true;
    else if (!this.client.manager.ws?.open)
      throw new ConfigError("SERVICE_UNAVAILABLE");

    return new Promise((resolve: ResolveBoolean, reject) => {
      const nonce = SnowflakeUtil.generate();
      const timeout = setTimeout(() => {
        if (this.client.manager.ws.handlers.has(nonce))
          reject(new ConfigError("UPDATE_SETTINGS_TIMEOUT"));
      }, 60000);
      this.client.manager.ws.handlers.set(
        nonce,
        (data: { success: boolean }) => {
          clearTimeout(timeout);
          if (data.success)
            delete this.client.manager.state.guildConfigs[this.id][key];
          resolve(data.success);
        }
      );
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.UPDATE_SETTINGS,
            {
              guild: this.id,
              key,
              action: UpdateSettingsAction.DELETE,
              updatedBy: updatedBy.id,
            },
            nonce
          )
        )
      );
    });
  }

  static async retrieve(
    guild: Snowflake | FireGuild,
    client: Fire
  ): Promise<boolean> {
    if (!client.manager.ws?.open) throw new ConfigError("SERVICE_UNAVAILABLE");

    const id = guild instanceof FireGuild ? guild.id : guild;
    if (client.manager.state.guildConfigs[id]) return true;
    return new Promise((resolve, reject) => {
      const nonce = SnowflakeUtil.generate();
      const timeout = setTimeout(() => {
        if (client.manager.ws.handlers.has(nonce))
          reject(new ConfigError("RETRIEVE_SETTINGS_TIMEOUT"));
      }, 60000);
      client.manager.ws.handlers.set(
        nonce,
        (data: { success: boolean; data: GuildOrUserConfig }) => {
          clearTimeout(timeout);
          if (data.success) {
            if (Object.keys(data.data).length)
              client.manager.state.guildConfigs[id] = data.data;
            resolve(true);
          } else resolve(false);
        }
      );
      client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.RETRIEVE_GUILD_CONFIG, { id }, nonce)
        )
      );
    });
  }
}

export class UserSettings {
  user: Snowflake | FireUser;
  client: Fire;

  constructor(client: Fire, user: Snowflake | FireUser) {
    this.client = client;
    this.user = user;
    if (this.unmigrated)
      (async () => {
        const migrated = await this.runMigration();
        if (!migrated)
          return this.client.console.error(
            `[UserSettings] Migration "${this.migrationId}" failed for ${
              this.user instanceof FireUser ? this.user.toString() : this.user
            } ${this.user instanceof FireUser ? "(" + this.user.id + ")" : ""}`
          );
        const updatedConfig = await this.set(
          `settings.migration.${this.migrationId}`,
          true
        );
        this.client.console.log(
          `[UserSettings] Migration "${this.migrationId}" complete for`,
          this.user instanceof FireUser ? this.user.toString() : this.user,
          `${this.user instanceof FireUser ? "(" + this.user.id + ")" : ""}${
            updatedConfig
              ? ""
              : " however adding the migration key to their config failed"
          }`
        );
      })();
  }

  get id() {
    return this.user instanceof FireUser ? this.user.id : this.user;
  }

  private get data() {
    return this.client.manager.state.userConfigs[this.id] ?? {};
  }

  // will check if migration is needed for the current migration script
  // must be synchronous so it can be used in the constructor and the getter below
  shouldMigrate() {
    return false;
  }

  // boolean to determine whether the migration has been run (based on the migrationId)
  // if a migration is needed (based on the return value of shouldMigrate)
  get unmigrated() {
    return (
      this.shouldMigrate() &&
      !this.get(`settings.migration.${this.migrationId}`, false)
    );
  }

  // unique identifier for the current migration script
  get migrationId() {
    return "";
  }

  // will be "return false;" unless there's a migration to run
  async runMigration(): Promise<boolean> {
    return false;
  }

  has(key: string) {
    return key in this.data;
  }

  get<T extends SettingsValueTypes>(option: string, defaultValue: T = null): T {
    return (this.data[option] ?? defaultValue) as T;
  }

  async set<T extends SettingsValueTypes>(key: string, value: T = null) {
    if (!this.client.manager.ws?.open)
      throw new ConfigError("SERVICE_UNAVAILABLE");

    const updated = new Promise((resolve: ResolveBoolean, reject) => {
      const nonce = SnowflakeUtil.generate();
      const timeout = setTimeout(() => {
        if (this.client.manager.ws.handlers.has(nonce))
          reject(new ConfigError("UPDATE_SETTINGS_TIMEOUT"));
      }, 60000);
      this.client.manager.ws.handlers.set(
        nonce,
        (data: { success: boolean }) => {
          clearTimeout(timeout);
          if (data.success && this.id in this.client.manager.state.userConfigs)
            this.client.manager.state.userConfigs[this.id][key] = value;
          else if (data.success)
            this.client.manager.state.userConfigs[this.id] = { [key]: value };
          resolve(data.success);
        }
      );
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.UPDATE_SETTINGS,
            {
              user: this.id,
              key,
              value,
              action: UpdateSettingsAction.SET,
            },
            nonce
          )
        )
      );
    });

    return updated;
  }

  async delete(key: string) {
    if (!this.has(key)) return true;
    else if (!this.client.manager.ws?.open)
      throw new ConfigError("SERVICE_UNAVAILABLE");

    return new Promise((resolve: ResolveBoolean, reject) => {
      const nonce = SnowflakeUtil.generate();
      const timeout = setTimeout(() => {
        if (this.client.manager.ws.handlers.has(nonce))
          reject(new ConfigError("UPDATE_SETTINGS_TIMEOUT"));
      }, 60000);
      this.client.manager.ws.handlers.set(
        nonce,
        (data: { success: boolean }) => {
          clearTimeout(timeout);
          if (data.success)
            delete this.client.manager.state.userConfigs[this.id][key];
          resolve(data.success);
        }
      );
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.UPDATE_SETTINGS,
            {
              user: this.id,
              key,
              action: UpdateSettingsAction.DELETE,
            },
            nonce
          )
        )
      );
    });
  }

  static async retrieve(
    user: Snowflake | FireUser | FireMember,
    client: Fire
  ): Promise<boolean> {
    if (!client.manager.ws?.open) throw new ConfigError("SERVICE_UNAVAILABLE");

    const id =
      user instanceof FireMember || user instanceof FireUser ? user.id : user;
    // this should in theory never be false
    if (client.manager.state.userConfigs[id]) return true;
    // so if we get here, something has probably gone wrong but whatever
    return new Promise((resolve, reject) => {
      const nonce = SnowflakeUtil.generate();
      const timeout = setTimeout(() => {
        if (client.manager.ws.handlers.has(nonce))
          reject(new ConfigError("RETRIEVE_SETTINGS_TIMEOUT"));
      }, 60000);
      client.manager.ws.handlers.set(
        nonce,
        (data: { success: boolean; data: GuildOrUserConfig }) => {
          clearTimeout(timeout);
          if (data.success) {
            if (Object.keys(data.data).length)
              client.manager.state.userConfigs[id] = data.data;
            resolve(true);
          } else resolve(false);
        }
      );
      client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.RETRIEVE_USER_CONFIG, { id }, nonce)
        )
      );
    });
  }
}
