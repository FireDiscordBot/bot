import { Fire } from "@fire/lib/Fire";
import { Provider } from "discord-akairo";
import { Collection, Snowflake } from "discord.js";
import Semaphore from "semaphore-async-await";
import { ArrayValue, Client, Primitive, ResultIterator } from "ts-postgres";

export class PostgresProvider extends Provider {
  declare items: Collection<Snowflake, any>;
  currentMigration: boolean;
  migrationLock: Semaphore;
  toMigrate: Snowflake[]; // array of keys that require migration
  dataColumn: string;
  tableName: string;
  idColumn: string;
  db: Client;
  bot: Fire;

  constructor(
    db: Client,
    bot: Fire,
    tableName: string,
    { idColumn = "gid", dataColumn = "data" } = {}
  ) {
    super();
    this.dataColumn = dataColumn;
    this.tableName = tableName;
    this.idColumn = idColumn;
    this.toMigrate = [];
    this.bot = bot;
    this.db = db;

    // if migration is needed on a table,
    // this will be tableName == "table"
    this.currentMigration = false;
    this.migrationLock = new Semaphore(2);
  }

  // shouldCheckShards is used to load all configs (e.g. for migrating guilds fire has left)
  async init(id?: Snowflake, shouldCheckShards: boolean = true) {
    const rows = id
      ? await this.db.query(
          `SELECT * FROM ${this.tableName} WHERE ${this.idColumn}=$1`,
          [id]
        )
      : await this.db.query(`SELECT * FROM ${this.tableName}`);
    if (!rows.rows.length) return;
    const shards = this.bot.options.shards as number[];
    for await (const row of rows) {
      const id = row.get(this.idColumn) as Snowflake;
      if (this.tableName == "guildconfig" && shouldCheckShards) {
        const shard = this.bot.util.getShard(id);
        if (!shards.includes(shard)) continue;
      }
      const data = row.get(this.dataColumn) as any;
      this.items.set(
        id,
        this.dataColumn
          ? typeof data === "string"
            ? JSON.parse(data as string)
            : data
          : row
      );

      // add to list so migration can be tracked (will remove upon completion)
      if (this.currentMigration) this.toMigrate.push(id);
    }
    return this.items;
  }

  get<T>(id: Snowflake, key: string, defaultValue: T = null): T {
    if (this.items.has(id)) {
      const value = this.items.get(id)[key];
      return value == null ? defaultValue : value;
    }

    return defaultValue;
  }

  set<T>(id: Snowflake, key: string, value: T): ResultIterator | boolean {
    const data = this.items.get(id) || {};
    const exists = this.items.has(id);

    data[key] = value;
    this.items.set(id, data);

    if (this.dataColumn) {
      return this.db.query(
        exists
          ? `UPDATE ${this.tableName} SET ${this.dataColumn} = $2 WHERE ${this.idColumn} = $1`
          : `INSERT INTO ${this.tableName} (${this.idColumn}, ${this.dataColumn}) VALUES ($1, $2)`,
        [id, data]
      );
    }

    return this.db.query(
      exists
        ? `UPDATE ${this.tableName} SET ${key} = $2 WHERE ${this.idColumn} = $1`
        : `INSERT INTO ${this.tableName} (${this.idColumn}, ${key}) VALUES ($1, $2)`,
      [id, value as unknown as ArrayValue<Primitive>]
    );
  }

  delete(id: Snowflake, key: string): ResultIterator {
    const data = this.items.get(id) || {};
    delete data[key];

    if (this.dataColumn) {
      return this.db.query(
        `UPDATE ${this.tableName} SET ${this.dataColumn} = $2 WHERE ${this.idColumn} = $1`,
        [id, data]
      );
    }

    return this.db.query(
      `UPDATE ${this.tableName} SET ${key} = $2 WHERE ${this.idColumn} = $1`,
      [id, null]
    );
  }

  clear(id: string) {}

  // clear(id: string): ResultIterator {
  //   this.items.delete(id);
  //   return this.db.query(
  //     `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = $1`,
  //     [id]
  //   );
  // }
}
