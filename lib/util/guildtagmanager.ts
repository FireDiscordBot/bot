import { LimitedCollection, DiscordAPIError, Snowflake } from "discord.js";
import { APIApplicationCommand } from "@fire/lib/interfaces/interactions";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Fire } from "@fire/lib/Fire";
import * as fuzz from "fuzzball";

const slashCommandNameRegex = /^[\w-]{1,32}$/gim;

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

  async init() {
    const result = await this.client.db
      .query("SELECT name FROM tags WHERE gid=$1;", [this.guild.configId])
      .catch(() => {});
    if (!result) return 0;
    for await (const tag of result) {
      this.names.push((tag.get("name") as string).toLowerCase());
      (tag.get("aliases") as string[])?.forEach((alias) =>
        this.aliases.push(alias.toLowerCase())
      );
    }
    if (this.names.length && !this.preparedSlashCommands)
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
    if (!this.names.length) return null;
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
    else return await this.fetchTag(tag, includeCreator);
  }

  private async fetchTag(name: string, includeCreator = false): Promise<Tag> {
    name = name.toLowerCase();
    const fetchedTag = await this.client.db
      .query(
        includeCreator
          ? "SELECT name, content, uid, aliases, uses FROM tags WHERE gid=$1 AND name=$2 OR gid=$1 AND $2=ANY(aliases)"
          : "SELECT name, content, aliases, uses FROM tags WHERE gid=$1 AND name=$2 OR gid=$1 AND $2=ANY(aliases)",
        [this.guild.configId, name]
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
        this.guild.configId,
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
        this.guild.configId,
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
        [this.guild.configId, name]
      )
      .first()
      .catch(() => {});
    if (!fetchedTag) return null;
    else return fetchedTag.get("uses") as number;
  }

  private async getAliases(name: string) {
    name = name.toLowerCase();
    const fetchedTag = await this.client.db
      .query(
        "SELECT aliases FROM tags WHERE gid=$1 AND name=$2 OR gid=$1 AND $2=ANY(aliases)",
        [this.guild.configId, name]
      )
      .first()
      .catch(() => {});
    if (!fetchedTag) return null;
    else return fetchedTag.get("aliases") as string[];
  }

  private async getTagSlashCommandJSON(cached: Tag) {
    if (!slashCommandNameRegex.test(cached.name)) {
      slashCommandNameRegex.lastIndex = 0;
      return null;
    }
    slashCommandNameRegex.lastIndex = 0;

    const description =
      (this.guild.language.get("TAG_SLASH_DESCRIPTION", {
        tag: cached.name,
      }) as string) + "\u200b"; // the zws will be used to idenfity tag commands

    return {
      name: cached.name,
      description,
    };
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

    const tags = await this.fetchTags();

    let commandData = await Promise.all(
      tags.map((tag) => this.getTagSlashCommandJSON(tag))
    );
    commandData = commandData.filter((tag) => !!tag);
    if (!commandData.length) this.preparedSlashCommands = true;

    commandData = commandData
      .filter(
        (tag) =>
          !current.find((cmd) => cmd.name == tag.name) ||
          current.find(
            (cmd) => cmd.name == tag.name && cmd.description.endsWith("\u200b")
          )
      )
      .filter(
        (tag) =>
          // remove those with options as they're not going to be tags
          !current.find((cmd) => cmd.name == tag.name && cmd.options?.length)
      );

    if (
      current.filter((cmd) =>
        commandData.find(
          (tag) => tag.name == cmd.name && tag.description == cmd.description
        )
      ).length == commandData.length
    )
      this.preparedSlashCommands = true;

    current = current.filter(
      (cmd) =>
        !commandData.find((tag) => tag.name == cmd.name) &&
        !(cmd.id in this.slashCommands && !tags.has(cmd.name))
    );

    await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.put({ data: [...current, ...commandData] })
      .then(
        (
          updated: {
            // typing the other fields is unnecessary
            // since we only need these
            id: string;
            name: string;
            description: string;
            options: any[];
          }[]
        ) => {
          if (!this.preparedSlashCommands)
            this.client.console.info(
              `[Commands] Successfully bulk updated ${updated.length} slash command tag(s) for guild ${this.guild.name}`
            );
          const slashTags = updated.filter(
            (command) =>
              !command.options?.length &&
              (commandData.find(
                (tag) =>
                  tag.name == command.name &&
                  tag.description == command.description &&
                  command.description.endsWith("\u200b")
              ) ||
                current.find(
                  (tag) =>
                    tag.name == command.name &&
                    tag.description == command.description &&
                    command.description.endsWith("\u200b")
                ))
          );
          for (const tag of slashTags) this.slashCommands[tag.id] = tag.name;
        }
      )
      .catch((e: DiscordAPIError) => {
        this.client.console.error(
          `[Commands] Failed to update slash command tags for guild ${
            this.guild.name
          }\n${e.code ?? 0}: ${e.stack}`
        );
        if (
          e.message.includes(
            "Maximum number of application commands reached (100)"
          )
        )
          this.guild.settings.set<boolean>("tags.slashcommands", null);
      });
    return (this.preparedSlashCommands = true);
  }

  async removeSlashCommands() {
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

    const tags = await this.fetchTags();

    // used to compare existing guild commands with possible slash commands
    let commandData = await Promise.all(
      tags.map((tag) => this.getTagSlashCommandJSON(tag))
    );
    commandData = commandData.filter((tag) => !!tag);
    if (!commandData.length) return (this.preparedSlashCommands = true);

    commandData = commandData
      .filter(
        (tag) =>
          !current.find((cmd) => cmd.name == tag.name) ||
          current.find(
            (cmd) => cmd.name == tag.name && cmd.description.endsWith("\u200b")
          )
      )
      .filter(
        (tag) =>
          // remove those with options as they're not going to be tags
          !current.find((cmd) => cmd.name == tag.name && cmd.options?.length)
      );

    current = current.filter(
      (cmd) =>
        !commandData.find(
          (tag) => tag.name == cmd.name && tag.description == cmd.description
        )
    );

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
      [this.guild.configId]
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
        [this.guild.configId, content.trim()]
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
    if (this.guild.id != this.guild.configId) return false;
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
    uses++;
    await this.client.db.query(
      "UPDATE tags SET uses=$1 WHERE gid=$2 AND name=$2 or gid=$2 AND $2=ANY(aliases);",
      [uses, this.guild.configId, tag]
    );
  }

  async addAlias(existing: string, alias: string) {
    if (this.guild.id != this.guild.configId) return false;
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
    if (this.guild.id != this.guild.configId) return false;
    name = name.toLowerCase();
    const tagExists = await this.doesTagExist(name);
    if (!tagExists) return false;
    await this.client.db.query(
      "UPDATE tags SET content=$1 WHERE name=$2 AND gid=$3;",
      [newContent, name, this.guild.id]
    );
    return true;
  }
}
