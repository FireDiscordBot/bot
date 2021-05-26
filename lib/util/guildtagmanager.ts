import { FireMember } from "@fire/lib/extensions/guildmember";
import {
  APIApplicationCommand,
  Option,
} from "@fire/lib/interfaces/interactions";
import { DiscordAPIError, Collection } from "discord.js";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Fire } from "@fire/lib/Fire";
import * as fuzz from "fuzzball";

const slashCommandNameRegex = /^[\w-]{1,32}$/gim;

export interface Tag {
  createdBy: string | FireUser | FireMember;
  aliases: string[];
  content: string;
  name: string;
  uses: number;
}

export class GuildTagManager {
  slashCommands: { [id: string]: string };
  cache: Collection<string, Tag>;
  preparedSlashCommands: boolean;
  ephemeral?: boolean;
  guild: FireGuild;
  names: string[];
  client: Fire;

  constructor(client: Fire, guild: FireGuild) {
    this.client = client;
    this.guild = guild;
    this.names = [];
    this.slashCommands = {};
    this.preparedSlashCommands = false;
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
    if (!this.preparedSlashCommands) this.prepareSlashCommands();
    if (this.names.includes(tag.toLowerCase()))
      return await this.getCachedTag(tag);
    const fuzzy = this.names.find(
      (name) =>
        fuzz.ratio(tag.trim().toLowerCase(), name.trim().toLowerCase()) >= 60
    );
    if (useFuzzy && fuzzy) return await this.getCachedTag(fuzzy);
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

  private async getTagSlashCommandJSON(cached: Tag) {
    if (!slashCommandNameRegex.test(cached.name)) {
      slashCommandNameRegex.lastIndex = 0;
      return null;
    }
    slashCommandNameRegex.lastIndex = 0;

    const description =
      (this.guild.language.get(
        "TAG_SLASH_DESCRIPTION",
        cached.name
      ) as string) + "\u200b"; // the zws will be used to idenfity tag commands

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
    if (this.names.length && !this.cache.size) await this.loadTags();

    this.ephemeral = this.guild.settings.get<boolean>("tags.ephemeral", true);

    let current = (await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.get<APIApplicationCommand[]>()
      .catch((e: DiscordAPIError) => e)) as APIApplicationCommand[];

    if (current instanceof DiscordAPIError && current.code == 50001) {
      // hasn't authorized applications.commands
      return null;
    } else if (
      current instanceof DiscordAPIError ||
      typeof current.find != "function"
    ) {
      return false;
    }

    let commandData = await Promise.all(
      this.cache.map((tag) => this.getTagSlashCommandJSON(tag))
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
        !(cmd.id in this.slashCommands && !this.cache.has(cmd.name))
    );

    await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.put({ data: [...current, ...commandData].slice(0, 100) })
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
      .catch((e: Error) =>
        this.client.console.error(
          `[Commands] Failed to update slash command tags for guild ${this.guild.name}\n${e.stack}`
        )
      );
    return (this.preparedSlashCommands = true);
  }

  async removeSlashCommands() {
    let current = (await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.get<APIApplicationCommand[]>()
      .catch((e: DiscordAPIError) => e)) as APIApplicationCommand[];

    if (current instanceof DiscordAPIError && current.code == 50001) {
      // hasn't authorized applications.commands
      return null;
    } else if (
      current instanceof DiscordAPIError ||
      typeof current.find != "function"
    ) {
      return false;
    }

    // used to compare existing guild commands with possible slash commands
    let commandData = await Promise.all(
      this.cache.map((tag) => this.getTagSlashCommandJSON(tag))
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

  async loadTags() {
    this.cache = new Collection();
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
    this.names = [
      ...this.cache.keyArray().map((name) => name.toLowerCase()),
      ...this.cache
        .map((tag) => tag.aliases.map((alias) => alias.toLowerCase()))
        .flat(),
    ];
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
    this.preparedSlashCommands && Object.keys(this.slashCommands).length
      ? this.createSlashTag(name)
      : this.prepareSlashCommands();
    return this.cache.get(name);
  }

  private async createSlashTag(tag: string) {
    const cached = await this.getCachedTag(tag);
    const command = await this.getTagSlashCommandJSON(cached);

    const commandRaw = await this.client.req
      .applications(this.client.user.id)
      .guilds(this.guild.id)
      .commands.post<APIApplicationCommand>({ data: command })
      .catch((e: DiscordAPIError) => e);
    if (commandRaw instanceof Error) {
      if (commandRaw.httpStatus != 403 && commandRaw.code != 50001)
        this.client.console.warn(
          `[Commands] Failed to register slash command for tag "${tag}" in guild ${this.guild.name}`,
          commandRaw
        );
    } else if (commandRaw?.id) this.slashCommands[commandRaw.id] = tag;
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
    this.deleteSlashTag(name);
    return this.cache.delete(name);
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
    if (exists && exists.name == alias) return false;
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
    this.names.push(alias);
    this.cache.set(cached.name, cached);
    return true;
  }

  async editTag(name: string, newContent: string) {
    name = name.toLowerCase();
    const cached = this.cache.find(
      (cached) => cached.name == name || cached.aliases.includes(name)
    );
    if (!cached) return false;
    await this.client.db.query(
      "UPDATE tags SET content=$1 WHERE name=$2 AND gid=$3;",
      [newContent, cached.name, this.guild.id]
    );
    cached.content = newContent;
    this.cache.set(cached.name, cached);
    return true;
  }
}
