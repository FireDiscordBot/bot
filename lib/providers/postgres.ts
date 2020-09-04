import { Provider, ProviderOptions } from "discord-akairo";
import { Client, ResultIterator } from "ts-postgres";

/**
 * Provider using the `ts-postgres` library.
 * @param {Client} db - Postgres database from `ts-postgres`.
 * @param {string} tableName - Name of table to handle.
 * @param {ProviderOptions} [options={}] - Options to use.
 * @extends {Provider}
 */
export default class PostgresProvider extends Provider {
  db: Client;
  tableName: string;
  idColumn: string;
  dataColumn: string;
  constructor(
    db: Client,
    tableName: string,
    { idColumn = "gid", dataColumn = null } = {}
  ) {
    super();

    /**
     * Postgres database.
     * @type {Client}
     */
    this.db = db;

    /**
     * Name of the table.
     * @type {string}
     */
    this.tableName = tableName;

    /**
     * Column for ID.
     * @type {string}
     */
    this.idColumn = idColumn;

    /**
     * Column for JSON data.
     * @type {?string}
     */
    this.dataColumn = dataColumn;
  }

  /**
   * Initializes the provider.
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    const rows = await this.db.query(`SELECT * FROM ${this.tableName}`);
    for await (const row of rows) {
      const idColumn = row.names.indexOf(this.idColumn);
      const dataColumn = row.names.indexOf(this.dataColumn);
      this.items.set(
        row.data[idColumn].toString(),
        this.dataColumn
          ? typeof row.data[dataColumn] === "string"
            ? JSON.parse(row.data[dataColumn] as string)
            : row.data[dataColumn]
          : row
      );
    }
  }

  /**
   * Gets a value.
   * @param {string} id - ID of entry.
   * @param {string} key - The key to get.
   * @param {any} [defaultValue] - Default value if not found or null.
   * @returns {any}
   */
  get(id: string, key: string, defaultValue: any = null): any {
    if (this.items.has(id)) {
      const value = this.items.get(id)[key];
      return value == null ? defaultValue : value;
    }

    return defaultValue;
  }

  /**
   * Sets a value.
   * @param {string} id - ID of entry.
   * @param {string} key - The key to set.
   * @param {any} value - The value.
   * @returns {ResultIterator}
   */
  set(id: string, key: string, value: any): ResultIterator {
    const data = this.items.get(id) || {};
    const exists = this.items.has(id);

    data[key] = value;
    this.items.set(id, data);

    if (this.dataColumn) {
      return this.db.query(
        exists
          ? `UPDATE ${this.tableName} SET ${this.dataColumn} = $2 WHERE ${this.idColumn} = $1`
          : `INSERT INTO ${this.tableName} (${this.idColumn}, ${this.dataColumn}) VALUES ($1, $2)`,
        [id, JSON.stringify(data)]
      );
    }

    return this.db.query(
      exists
        ? `UPDATE ${this.tableName} SET ${key} = $2 WHERE ${this.idColumn} = $1`
        : `INSERT INTO ${this.tableName} (${this.idColumn}, ${key}) VALUES ($1, $2)`,
      [id, value]
    );
  }

  /**
   * Deletes a value.
   * @param {string} id - ID of entry.
   * @param {string} key - The key to delete.
   * @returns {ResultIterator}
   */
  delete(id: string, key: string): ResultIterator {
    const data = this.items.get(id) || {};
    delete data[key];

    if (this.dataColumn) {
      return this.db.query(
        `UPDATE ${this.tableName} SET ${this.dataColumn} = $2 WHERE ${this.idColumn} = $1`,
        [id, JSON.stringify(data)]
      );
    }

    return this.db.query(
      `UPDATE ${this.tableName} SET ${key} = $2 WHERE ${this.idColumn} = $1`,
      [id, null]
    );
  }

  /**
   * Clears an entry.
   * @param {string} id - ID of entry.
   * @returns {ResultIterator}
   */
  clear(id: string): ResultIterator {
    this.items.delete(id);
    return this.db.query(
      `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = $1`,
      [id]
    );
  }
}
