import { LimitedCollection, DiscordAPIError, Snowflake } from "discord.js";
import { APIApplicationCommand } from "@fire/lib/interfaces/interactions";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Fire } from "@fire/lib/Fire";
import * as fuzz from "fuzzball";

const slashCommandNameRegex =
  /^[-_\p{L}\p{N}\p{Script=Devanagari}\p{Script=Thai}]{1,32}$/gmu;

export interface Tag {
  createdBy: Snowflake | FireUser | FireMember;
  aliases: string[];
  content: string;
  name: string;
  uses: number;
}

export class GuildTagManager {
  slashCommands: { [id: string]: string };
  preparedSlashCommands: boolean;
  aliases: string[];
  guild: FireGuild;
  names: string[];
  client: Fire;

  constructor(client: Fire, guild: FireGuild) {
    this.client = client;
    this.guild = guild;
    this.names = [];
    this.aliases = [];
    this.slashCommands = {};
    this.preparedSlashCommands = false;
  }

  get size() {
    return this.names.length;
  }

  get ephemeral() {
    return this.guild.settings.get<boolean>("tags.ephemeral", true);
  }

  getFuzzyMatches(tag: string, limit = 25, forceRatio?: number) {
    if (!this.size) return [];
    let ratio = forceRatio ?? 90;
    let fuzzy: string[] = [];
    while (!fuzzy.length && ratio >= (forceRatio ?? 60)) {
      fuzzy = this.names.filter(
        (name) =>
          fuzz.ratio(tag.trim().toLowerCase(), name.trim().toLowerCase()) >=
          ratio--
      );
    }
    if (!fuzzy.length)
      fuzzy = this.names.filter((name) => name.startsWith(tag));
    return fuzzy.slice(0, limit);
  }

  async init() {
    const result = await this.client.db
      .query("SELECT name FROM tags WHERE gid=$1;", [this.guild.id])
      .catch(() => {});
    if (!result) return 0;
    for await (const tag of result) {
      this.names.push((tag.get("name") as string).toLowerCase());
      (tag.get("aliases") as string[])?.forEach((alias) =>
        this.aliases.push(alias.toLowerCase())
      );
    }
    if (this.size && !this.preparedSlashCommands)
      await this.prepareSlashCommands();
    return this.size;
  }

  async getTag(tag: string, useFuzzy = true, includeCreator = false) {
    if (!this.preparedSlashCommands) this.prepareSlashCommands();
    if (
      this.names.includes(tag.toLowerCase()) ||
      this.aliases.includes(tag.toLowerCase())
    )
      return await this.fetchTag(tag, includeCreator);
    if (!this.size) return null;
    const fuzzy = this.names.sort(
      (a, b) =>
        fuzz.ratio(tag.trim().toLowerCase(), b.trim().toLowerCase()) -
        fuzz.ratio(tag.trim().toLowerCase(), a.trim().toLowerCase())
    );
    const bestMatch = fuzzy[0];
    if (
      useFuzzy &&
      fuzz.ratio(tag.trim().toLowerCase(), bestMatch.trim().toLowerCase()) >= 60
    )
      return await this.fetchTag(bestMatch, includeCreator);
    else return null;
  }

  private async fetchTag(name: string, includeCreator = false): Promise<Tag> {
    name = name.toLowerCase();
    const fetchedTag = await this.client.db
      .query(
        includeCreator
          ? "SELECT name, content, uid, aliases, uses FROM tags WHERE gid=$1 AND name=$2 OR gid=$1 AND $2=ANY(aliases)"
          : "SELECT name, content, aliases, uses FROM tags WHERE gid=$1 AND name=$2 OR gid=$1 AND $2=ANY(aliases)",
        [this.guild.id, name]
      )
      .first()
      .catch(() => {});
    if (!fetchedTag) return null;
    const tag: Tag = {
      createdBy: (fetchedTag.get("uid") as string) ?? null,
      content: fetchedTag.get("content") as string,
      aliases: (fetchedTag.get("aliases") as string[]) ?? [],
      name: fetchedTag.get("name") as string,
      uses: fetchedTag.get("uses") as number,
    };
    if (typeof tag.createdBy == "string") {
      const creatorId = tag.createdBy;
      const member = this.guild.members.cache.get(creatorId) as FireMember;
      const user = this.client.users.cache.get(creatorId) as FireUser;
      if (member) tag.createdBy = member;
      else if (user) tag.createdBy = user;
      else {
        const fetched = await this.client.users
          .fetch(creatorId)
          .catch(() => {});
        if (fetched) tag.createdBy = fetched as FireUser;
      }
    }
    return tag;
  }

  private async doesTagExist(name: string) {
    name = name.toLowerCase();
    if (this.names.includes(name)) return true;
    const exists = await this.client.db
      .query("SELECT name FROM tags WHERE gid=$1 AND name=$2", [
        this.guild.id,
        name,
      ])
      .first()
      .catch(() => {});
    return exists && exists.get("name") == name;
  }

  private async doesAliasExist(alias: string) {
    alias = alias.toLowerCase();
    if (this.aliases.includes(alias)) return true;
    const exists = await this.client.db
      .query("SELECT name FROM tags WHERE gid=$1 AND $2=ANY(aliases)", [
        this.guild.id,
        alias,
      ])
      .first()
      .catch(() => {});
    return exists && (exists.get("aliases") as string[])?.includes(alias);
  }

  private async getUses(name: string) {
    name = name.toLowerCase();
    const fetchedTag = await this.client.db
      .query(
        "SELECT uses FROM tags WHERE gid=$1 AND name=$2 OR gid=$1 AND $2=ANY(aliases)",
        [this.guild.id, name]
      )
      .first()
      .catch(() => {});
    if (!fetchedTag) return null;
    else return fetchedTag.get("uses") as number;
  }

  private getTagSlashCommandJSON(cached: Tag) {
    if (!slashCommandNameRegex.test(cached.name)) {
      slashCommandNameRegex.lastIndex = 0;
      return null;
    }
    slashCommandNameRegex.lastIndex = 0;

    const description = this.guild.language.get("TAG_SLASH_DESCRIPTION", {
      tag: cached.name,
    }) as string;

    return {
      name: cached.name,
      description,
    };
  }

  private isSlashTag(cmd: APIApplicationCommand) {
    return (
      !cmd.options?.length &&
      this.names.includes(cmd.name) &&
      cmd.description.trim() ==
        this.guild.language
          .get("TAG_SLASH_DESCRIPTION", {
            tag: cmd.name,
          })
          .trim()
    );
  }

  async prepareSlashCommands() {
    const useSlash = this.guild.settings.get<boolean>(
      "tags.slashcommands",
      false
    );
    if (!useSlash) return false;

    let current = (await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.get<APIApplicationCommand[]>()
      .catch((e: DiscordAPIError) => e)) as APIApplicationCommand[];

    if (current instanceof DiscordAPIError && current.code == 50001)
      // hasn't authorized applications.commands
      return null;
    else if (
      current instanceof DiscordAPIError ||
      typeof current.find != "function"
    )
      return false;

    for (const slashTag of current.filter((cmd) => this.isSlashTag(cmd)))
      this.slashCommands[slashTag.id] = slashTag.name;

    const tags = await this.fetchTags();

    let commandData = tags
      .map((tag) => this.getTagSlashCommandJSON(tag))
      .filter((tag) => !!tag)
      .filter(
        (tag) =>
          // we only want to have slash tags that don't already exist
          !current.find((cmd) => cmd.name == tag.name && this.isSlashTag(cmd))
      );
    if (!commandData.length) return (this.preparedSlashCommands = true);

    current = current.filter(
      (cmd) => !(cmd.id in this.slashCommands && !tags.has(cmd.name))
    );

    await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.put({ data: [...current, ...commandData] })
      .then((updated: APIApplicationCommand[]) => {
        const slashTags = updated.filter((command) => this.isSlashTag(command));
        if (!this.preparedSlashCommands)
          this.client.console.info(
            `[Commands] Successfully bulk updated ${slashTags.length} slash command tags for guild ${this.guild.name}`
          );
        for (const tag of slashTags)
          if (this.slashCommands[tag.id] != tag.name)
            this.slashCommands[tag.id] = tag.name;
      })
      .catch((e: DiscordAPIError) => {
        this.client.console.error(
          `[Commands] Failed to update slash command tags for guild ${
            this.guild.name
          }\n${e.code ?? 0}: ${e.stack}`
        );
        if (
          e.message.includes("Maximum number of application commands reached")
        )
          this.guild.settings.set<boolean>("tags.slashcommands", null);
      });
    return (
      (this.preparedSlashCommands = true) &&
      this.guild.settings.get<boolean>("tags.slashcommands")
    );
  }

  async removeSlashCommands() {
    if (!this.preparedSlashCommands)
      await this.prepareSlashCommands().catch(() => {});
    if (!Object.keys(this.slashCommands).length) return false;

    let current = (await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.get<APIApplicationCommand[]>()
      .catch((e: DiscordAPIError) => e)) as APIApplicationCommand[];

    if (current instanceof DiscordAPIError && current.code == 50001)
      // hasn't authorized applications.commands
      return null;
    else if (
      current instanceof DiscordAPIError ||
      typeof current.find != "function"
    )
      return false;

    current = current.filter((cmd) => !this.slashCommands[cmd.id]);

    const removed = await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.put({ data: current })
      .then(() => {
        this.client.console.info(
          `[Commands] Successfully removed slash command tags from guild ${this.guild.name}`
        );
        this.slashCommands = {};
        return true;
      })
      .catch((e: Error) =>
        this.client.console.error(
          `[Commands] Failed to remove slash command tags for guild ${this.guild.name}\n${e.stack}`
        )
      );
    return removed;
  }

  async fetchTags() {
    const result = await this.client.db.query(
      "SELECT * FROM tags WHERE gid=$1;",
      [this.guild.id]
    );
    const tags = new LimitedCollection<string, Tag>({
      maxSize: 100,
    });
    for await (const tag of result) {
      tags.set(tag.get("name") as string, {
        name: (tag.get("name") as string).toLowerCase(),
        content: tag.get("content") as string,
        aliases:
          (tag.get("aliases") as string[])?.map((alias) =>
            alias.toLowerCase()
          ) || [],
        createdBy: tag.get("uid") as Snowflake,
        uses: tag.get("uses") as number,
      });
    }
    this.names = [
      ...tags.map((tag) => tag.name.toLowerCase()),
      ...tags
        .map((tag) => tag.aliases.map((alias) => alias.toLowerCase()))
        .flat(),
    ];
    return tags;
  }

  async findSimilarTag(content: string) {
    const fetchedTag = await this.client.db
      .query(
        "SELECT name, content, aliases, uses FROM tags WHERE gid=$1 AND content=$2",
        [this.guild.id, content.trim()]
      )
      .first();
    if (!fetchedTag) return null;
    else
      return {
        content: fetchedTag.get("content") as string,
        aliases: (fetchedTag.get("aliases") as string[]) ?? [],
        name: fetchedTag.get("name") as string,
        uses: fetchedTag.get("uses") as number,
        createdBy: null,
      } as Tag;
  }

  async createTag(name: string, content: string, user: FireUser | FireMember) {
    name = name.toLowerCase();
    content = content.trim();
    if (this.names.includes(name)) return false;
    const existing = await this.findSimilarTag(content);
    if (existing) return await this.addAlias(existing.name, name);
    await this.client.db.query(
      "INSERT INTO tags (gid, name, content, uid) VALUES ($1, $2, $3, $4);",
      [this.guild.id, name, content, user.id]
    );
    this.names.push(name);
    this.preparedSlashCommands && Object.keys(this.slashCommands).length
      ? this.createSlashTag(name)
      : this.prepareSlashCommands();
    return {
      name,
      content,
      uses: 0,
      aliases: [],
      createdBy: user,
    };
  }

  private async createSlashTag(name: string) {
    const tag = await this.fetchTag(name);
    const command = await this.getTagSlashCommandJSON(tag);

    const commandRaw = await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.post<APIApplicationCommand>({ data: command })
      .catch((e: DiscordAPIError) => e);
    if (commandRaw instanceof Error) {
      if (commandRaw.httpStatus != 403 && commandRaw.code != 50001)
        this.client.console.warn(
          `[Commands] Failed to register slash command for tag "${name}" in guild ${this.guild.name}`,
          commandRaw
        );
    } else if (commandRaw?.id) this.slashCommands[commandRaw.id] = name;
  }

  async deleteTag(name: string) {
    name = name.toLowerCase();
    const tag = await this.getTag(name, false);
    name = tag?.name; // make sure name != an alias even though the command should handle this
    if (!name) return false;
    await this.client.db.query("DELETE FROM tags WHERE gid=$1 AND name=$2;", [
      this.guild.id,
      name,
    ]);
    this.names = this.names.filter(
      (n) => n != name && !tag.aliases.includes(n)
    );
    this.deleteSlashTag(name);
    return true;
  }

  private async deleteSlashTag(tag: string) {
    const entries = Object.entries(this.slashCommands);
    if (!entries.length) return;
    const [id] = entries.find(([, name]) => name == tag) || [null];
    if (!id) return;

    await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands(id)
      .delete()
      .catch(() =>
        this.client.console.error(
          `[Commands] Failed to delete slash command for tag "${tag}" in guild ${this.guild.name}`
        )
      );
  }

  async useTag(tag: string) {
    tag = tag.toLowerCase();
    let uses = await this.getUses(tag);
    await this.client.db.query(
      "UPDATE tags SET uses=$1 WHERE gid=$2 AND name=$3 OR gid=$2 AND $3=ANY(aliases);",
      [++uses, this.guild.id, tag]
    );
  }

  async addAlias(existing: string, alias: string) {
    existing = existing.toLowerCase();
    alias = alias.toLowerCase();
    const nameExists = await this.doesTagExist(existing);
    if (!nameExists) return false;
    const aliasExists = await this.doesAliasExist(alias);
    if (aliasExists) return false;
    const tag = await this.getTag(existing, false);
    if (!tag) return false;
    let aliases = tag.aliases;
    if (aliases.includes(alias))
      aliases = aliases.filter((a) => a.toLowerCase() != alias);
    else aliases.push(alias);
    await this.client.db.query(
      "UPDATE tags SET aliases=$1 WHERE name=$2 AND gid=$3;",
      [aliases.length ? aliases : null, tag.name, this.guild.id]
    );
    this.names.push(alias);
    return true;
  }

  async editTag(name: string, newContent: string) {
    name = name.toLowerCase();
    const tagExists = await this.doesTagExist(name);
    if (!tagExists) return false;
    await this.client.db.query(
      "UPDATE tags SET content=$1 WHERE name=$2 AND gid=$3;",
      [newContent, name, this.guild.id]
    );
    return true;
  }

  async renameTag(name: string, newName: string) {
    name = name.toLowerCase();
    const tagExists = await this.doesTagExist(name);
    if (!tagExists) return false;
    await this.client.db.query(
      "UPDATE tags SET name=$1 WHERE name=$2 AND gid=$3;",
      [newName, name, this.guild.id]
    );
    this.names = this.names.filter((n) => n != name);
    this.names.push(newName);
    return true;
  }
}
