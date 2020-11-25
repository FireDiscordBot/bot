import { FireMember } from "../extensions/guildmember";
import { FireGuild } from "../extensions/guild";
import { FireUser } from "../extensions/user";
import { Collection } from "discord.js";
import * as fuzz from "fuzzball";
import { Fire } from "../Fire";

export interface Tag {
  name: string;
  content: string;
  uses: number;
  aliases: string[];
  createdBy: string | FireUser | FireMember;
}

export class GuildTagManager {
  client: Fire;
  names: string[];
  guild: FireGuild;
  cache: Collection<string, Tag>;

  constructor(client: Fire, guild: FireGuild) {
    this.client = client;
    this.guild = guild;
    this.names = [];
    this.cache = new Collection<string, Tag>();

    this.client.db
      .query("SELECT name FROM tags WHERE gid=$1;", [this.guild.id])
      .then(async (result) => {
        for await (const tag of result) {
          this.names.push((tag.get("name") as string).toLowerCase());
          (tag.get("aliases") as string[])?.forEach((alias) =>
            this.names.push(alias.toLowerCase())
          );
        }
      })
      .catch(() => {});
  }

  get size() {
    return this.cache.size || this.names.length;
  }

  async getTag(tag: string, useFuzzy = true) {
    if (this.names.length && !this.cache.size) await this.loadTags();
    for (const name of this.names) {
      if (
        useFuzzy &&
        fuzz.ratio(tag.trim().toLowerCase(), name.trim().toLowerCase()) >= 60
      ) {
        return await this.getCachedTag(name);
      }
    }
    return await this.getCachedTag(tag);
  }

  private async getCachedTag(tag: string) {
    tag = tag.toLowerCase();
    const cachedTag = this.cache.find(
      (cached) =>
        cached.name.toLowerCase() == tag || cached.aliases.includes(tag)
    );
    if (!cachedTag) return null;
    if (typeof cachedTag.createdBy == "string") {
      const creatorId = cachedTag.createdBy;
      const member = this.guild.members.cache.get(creatorId) as FireMember;
      const user = this.client.users.cache.get(creatorId) as FireUser;
      if (member) cachedTag.createdBy = member;
      else if (user) cachedTag.createdBy = user;
      else {
        const fetched = await this.client.users
          .fetch(creatorId)
          .catch(() => {});
        if (fetched) cachedTag.createdBy = fetched as FireUser;
      }
      this.cache.set(cachedTag.name, cachedTag);
    }
    return cachedTag;
  }

  async loadTags() {
    const result = await this.client.db.query(
      "SELECT * FROM tags WHERE gid=$1;",
      [this.guild.id]
    );
    for await (const tag of result) {
      this.cache.set(tag.get("name") as string, {
        name: (tag.get("name") as string).toLowerCase(),
        content: tag.get("content") as string,
        aliases:
          (tag.get("aliases") as string[])?.map((alias) =>
            alias.toLowerCase()
          ) || [],
        createdBy: tag.get("uid") as string,
        uses: tag.get("uses") as number,
      });
    }
    return this.cache;
  }

  async createTag(name: string, content: string, user: FireUser | FireMember) {
    name = name.toLowerCase();
    if (this.names.includes(name)) return false;
    if (this.names.length && !this.cache.size) await this.loadTags();
    const existing = this.cache.find((tag) => tag.content == content);
    if (existing) {
      return await this.addAlias(existing.name, name);
    }
    await this.client.db.query(
      "INSERT INTO tags (gid, name, content, uid) VALUES ($1, $2, $3, $4);",
      [this.guild.id, name, content, user.id]
    );
    this.names.push(name);
    this.cache.set(name, {
      name,
      content,
      uses: 0,
      aliases: [],
      createdBy: user,
    });
    return this.cache.get(name);
  }

  async deleteTag(name: string) {
    name = name.toLowerCase();
    if (this.names.length && !this.cache.size) await this.loadTags();
    const cachedTag = this.cache.find(
      (tag) => tag.name.toLowerCase() == name || tag.aliases.includes(name)
    );
    name = cachedTag?.name; // make sure name != an alias even though the command should handle this
    if (!name) return false;
    await this.client.db.query("DELETE FROM tags WHERE gid=$1 AND name=$2;", [
      this.guild.id,
      name,
    ]);
    this.names = this.names.filter(
      (n) => n != name && !cachedTag.aliases.includes(n)
    );
    return this.cache.delete(name);
  }

  async useTag(tag: string) {
    tag = tag.toLowerCase();
    const cached = this.cache.find(
      (cached) =>
        cached.name.toLowerCase() == tag || cached.aliases.includes(tag)
    );
    const uses = ++cached.uses;
    await this.client.db.query(
      "UPDATE tags SET uses=$1 WHERE name=$2 AND gid=$3;",
      [uses, cached.name, this.guild.id]
    );
    cached.uses = uses;
    this.cache.set(cached.name, cached);
  }

  async addAlias(existing: string, alias: string) {
    existing = existing.toLowerCase();
    alias = alias.toLowerCase();
    const exists = await this.getTag(alias);
    if (exists && (exists.name == alias || !exists.aliases.includes(alias)))
      return false;
    const cached = this.cache.find(
      (cached) =>
        cached.name.toLowerCase() == existing ||
        cached.aliases.includes(existing)
    );
    let aliases = cached.aliases;
    if (aliases.includes(alias))
      aliases = aliases.filter((a) => a.toLowerCase() != alias);
    else aliases.push(alias);
    await this.client.db.query(
      "UPDATE tags SET aliases=$1 WHERE name=$2 AND gid=$3;",
      [aliases.length ? aliases : null, cached.name, this.guild.id]
    );
    cached.aliases = aliases;
    this.cache.set(cached.name, cached);
    return true;
  }

  async editTag(name: string, newContent: string) {
    name = name.toLowerCase();
    const cached = this.cache.find(
      (cached) => cached.name == name || cached.aliases.includes(name)
    );
    await this.client.db.query(
      "UPDATE tags SET content=$1 WHERE name=$2 AND gid=$3;",
      [newContent, cached.name, this.guild.id]
    );
    cached.content = newContent;
    this.cache.set(cached.name, cached);
  }
}
