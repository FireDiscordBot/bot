import {
  Util,
  Role,
  Guild,
  Collection,
  Structures,
  TextChannel,
  MessageEmbed,
  CategoryChannel,
  MessageAttachment,
  MessageEmbedOptions,
  PermissionOverwriteOption,
} from "discord.js";
import { ActionLogType, MemberLogType, ModLogType } from "../util/constants";
import { GuildTagManager } from "../util/guildtagmanager";
import Tickets from "../../src/commands/Tickets/tickets";
import { FakeChannel } from "./slashCommandMessage";
import { GuildSettings } from "../util/settings";
import { getIDMatch } from "../util/converters";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { v4 as uuidv4 } from "uuid";
import { FireUser } from "./user";
import { nanoid } from "nanoid";
import { Fire } from "../Fire";

const parseUntil = (time?: string) => {
  if (!time) return 0;
  if (time.includes(".")) {
    // legacy py time
    return parseInt((parseFloat(time) * 1000).toString().split(".")[0]);
  } else return parseInt(time);
};

export class FireGuild extends Guild {
  persistedRoles: Collection<string, string[]>;
  inviteRoles: Collection<string, string>;
  invites: Collection<string, number>;
  mutes: Collection<string, number>;
  muteCheckTask: NodeJS.Timeout;
  settings: GuildSettings;
  tags: GuildTagManager;
  owner: FireMember;
  client: Fire;

  constructor(client: Fire, data: object) {
    super(client, data);

    this.settings = new GuildSettings(client, this);
    this.tags = new GuildTagManager(client, this);
    this.persistedRoles = new Collection();
    this.inviteRoles = new Collection();
    this.invites = new Collection();
    this.loadMutes();
  }

  get language() {
    return this.client.getLanguage(
      this.settings.get("utils.language", "en-US")
    );
  }

  get premium() {
    return this.client.util?.premium.has(this.id);
  }

  get muteRole() {
    const id: string = this.settings.get(
      "mod.mutedrole",
      this.roles.cache.find((role) => role.name == "Muted")?.id
    );
    if (!id) return null;
    return this.roles.cache.get(id);
  }

  _patch(data: any) {
    delete data.members;
    delete data.presences;

    // @ts-ignore
    super._patch(data);
  }

  async initMuteRole() {
    if (this.muteRole) return this.muteRole;
    const role = await this.roles
      .create({
        data: {
          position: this.me.roles.highest.rawPosition - 2, // -1 seems to fail a lot more than -2 so just do -2 to be safe
          mentionable: false,
          color: "#24242c",
          permissions: 0,
          name: "Muted",
          hoist: false,
        },
        reason: this.language.get("MUTE_ROLE_CREATE_REASON") as string,
      })
      .catch(() => {});
    if (!role) return false;
    this.settings.set("mod.mutedrole", role.id);
    for (const [, channel] of this.channels.cache) {
      await channel
        .updateOverwrite(
          role,
          {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
          },
          this.language.get("MUTE_ROLE_CREATE_REASON") as string
        )
        .catch(() => {});
    }
    return role;
  }

  async changeMuteRole(role: Role) {
    const changed = await role
      .edit({
        position: this.me.roles.highest.rawPosition - 2,
        permissions: 0,
      })
      .catch(() => {});
    if (!changed) return false;
    this.settings.set("mod.mutedrole", role.id);
    for (const [, channel] of this.channels.cache) {
      await channel
        .updateOverwrite(
          role,
          {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
          },
          this.language.get("MUTE_ROLE_CREATE_REASON") as string
        )
        .catch(() => {});
    }
    return changed;
  }

  private async loadMutes() {
    this.mutes = new Collection();
    const mutes = await this.client.db
      .query("SELECT * FROM mutes WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!mutes)
      return this.client.console.error(
        `[Guild] Failed to load mutes for ${this.name} (${this.id})`
      );
    for await (const mute of mutes) {
      this.mutes.set(
        mute.get("uid") as string,
        parseUntil(mute.get("until") as string)
      );
    }
    if (this.muteCheckTask) clearInterval(this.muteCheckTask);
    this.muteCheckTask = setInterval(this.checkMutes.bind(this), 60000);
  }

  private async checkMutes() {
    if (!this.client.user) return; // likely not ready yet
    const me =
      this.me instanceof FireMember
        ? this.me
        : ((await this.members
            .fetch(this.client.user.id)
            .catch(() => {})) as FireMember);
    if (!me) return; // could mean discord issues so return
    const now = +new Date();
    for (const [id] of this.mutes.filter(
      // likely never gonna be equal but if somehow it is then you're welcome
      (time) => !!time && now >= time
    )) {
      const member = (await this.members
        .fetch(id)
        .catch(() => {})) as FireMember;
      if (member) {
        const unmuted = await member.unmute(
          this.language.get("UNMUTE_AUTOMATIC") as string,
          this.me as FireMember
        );
        this.mutes.delete(id); // ensures id is removed from cache even if above fails to do so
        if (typeof unmuted == "string") {
          this.client.console.warn(
            `[Guild] Failed to remove mute for ${member} (${id}) in ${this.name} (${this.id}) due to ${unmuted}`
          );
          await this.modLog(
            this.language.get(
              "UNMUTE_AUTO_FAIL",
              `${member} (${id})`,
              this.language.get(`UNMUTE_FAILED_${unmuted.toUpperCase()}`)
            ),
            "unmute"
          );
        } else continue;
      } else {
        this.mutes.delete(id);
        const dbremove = await this.client.db
          .query("DELETE FROM mutes WHERE gid=$1 AND uid=$2;", [
            this.id,
            this.id,
          ])
          .catch(() => {});
        const embed = new MessageEmbed()
          .setColor("#2ECC71")
          .setTimestamp(now)
          .setAuthor(
            this.language.get("UNMUTE_LOG_AUTHOR", id),
            this.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .addField(this.language.get("MODERATOR"), me.toString())
          .setFooter(id.toString());
        if (!dbremove)
          embed.addField(
            this.language.get("ERROR"),
            this.language.get("UNMUTE_FAILED_DB_REMOVE")
          );
        await this.modLog(embed, "unmute").catch(() => {});
      }
    }
  }

  async loadInviteRoles() {
    this.inviteRoles = new Collection();
    if (!this.premium) return;
    const invroles = await this.client.db
      .query("SELECT * FROM invrole WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!invroles)
      return this.client.console.error(
        `[Guild] Failed to load invite roles for ${this.name} (${this.id})`
      );
    for (const invrole of invroles)
      this.inviteRoles.set(
        invrole.get("inv") as string,
        invrole.get("rid") as string
      );
  }

  async loadPersistedRoles() {
    this.persistedRoles = new Collection();
    if (!this.premium) return;
    const persisted = await this.client.db
      .query("SELECT * FROM rolepersists WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!persisted)
      return this.client.console.error(
        `[Guild] Failed to load persisted roles for ${this.name} (${this.id})`
      );
    for (const role of persisted)
      this.persistedRoles.set(
        role.get("uid") as string,
        role.get("roles") as string[]
      );
  }

  async loadInvites() {
    this.invites = new Collection();
    if (!this.premium) return;
    const invites = await this.fetchInvites().catch(() => {});
    if (!invites) return this.invites;
    for (const [code, invite] of invites) this.invites.set(code, invite.uses);
    if (this.features.includes("VANITY_URL")) {
      const vanity = await this.fetchVanityData().catch(() => {});
      if (vanity) this.invites.set(vanity.code, vanity.uses);
    }
    return this.invites;
  }

  isPublic() {
    return (
      this.settings.get("utils.public", false) ||
      (this.features && this.features.includes("DISCOVERABLE"))
    );
  }

  getDiscoverableData() {
    let splash = "https://i.imgur.com/jWRMBRd.png";
    if (this.splash)
      splash = this.splashURL({
        size: 2048,
        format: "png",
      }).replace("size=2048", "size=320");
    else if (this.discoverySplash)
      splash = this.discoverySplashURL({
        size: 2048,
        format: "png",
      }).replace("size=2048", "size=320");
    const icon =
      this.iconURL({
        format: "png",
        size: 128,
        dynamic: true,
      }) || "https://cdn.discordapp.com/embed/avatars/0.png";
    return {
      name: this.name,
      id: this.id,
      icon,
      splash,
      vanity: `https://discover.inv.wtf/${this.id}`,
      members: this.memberCount,
    };
  }

  getMember(name: string): FireMember | null {
    const username = name.split("#")[0];
    const member = this.members.cache.find(
      (member) =>
        member.toString().toLowerCase() == name.toLowerCase() ||
        member.displayName?.toLowerCase() == username.toLowerCase() ||
        member.user.username?.toLowerCase() == username.toLowerCase()
    );

    return member ? (member as FireMember) : null;
  }

  async fetchMember(name: string): Promise<FireMember | null> {
    const member = this.getMember(name);

    if (member) return member;
    const fetchedMembers = await this.members.fetch({
      user: this.members.cache.size ? [...this.members.cache.array()] : [],
      query: name,
      limit: 1,
    });

    return fetchedMembers.first() as FireMember | null;
  }

  async actionLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type: ActionLogType
  ) {
    const channel = this.channels.cache.get(this.settings.get("log.action"));
    if (!channel || channel.type != "text") return;
    return await (channel as TextChannel).send(log).catch(() => {});
  }

  async modLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type: ModLogType
  ) {
    const channel = this.channels.cache.get(
      this.settings.get("log.moderation")
    );
    if (!channel || channel.type != "text") return;
    return await (channel as TextChannel).send(log).catch(() => {});
  }

  async memberLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type: MemberLogType
  ) {
    const channel = this.channels.cache.get(this.settings.get("log.members"));
    if (!channel || channel.type != "text") return;
    return await (channel as TextChannel).send(log).catch(() => {});
  }

  hasExperiment(id: string, treatmentId?: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild") return false;
    for (const c of Object.keys(experiment.defaultConfig)) {
      if (!this.settings.has(c))
        this.settings.set(c, experiment.defaultConfig[c]);
    }
    if (treatmentId != undefined) {
      const treatment = experiment.treatments.find((t) => t.id == treatmentId);
      if (!treatment) return false;
      return Object.keys(treatment.config).every(
        (c) =>
          this.settings.get(c, experiment.defaultConfig[c] || null) ==
          treatment.config[c]
      );
    } else
      return experiment.treatments.some((treatment) => {
        return Object.keys(treatment.config).every(
          (c) =>
            this.settings.get(c, experiment.defaultConfig[c] || null) ==
            treatment.config[c]
        );
      });
  }

  giveExperiment(id: string, treatmentId: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild")
      throw new Error("Experiment is not a guild experiment");
    const treatment = experiment.treatments.find((t) => t.id == treatmentId);
    if (!treatment) throw new Error("Invalid Treatment ID");
    Object.keys(experiment.defaultConfig).forEach(
      // Set to default before applying treatment changes
      (c) => this.settings.set(c, experiment.defaultConfig[c])
    );
    Object.keys(treatment.config).forEach((c) =>
      this.settings.set(c, treatment.config[c])
    );
    return this.hasExperiment(id, treatmentId);
  }

  removeExperiment(id: string) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild")
      throw new Error("Experiment is not a guild experiment");
    Object.keys(experiment.defaultConfig).forEach((c) =>
      this.settings.set(c, experiment.defaultConfig[c])
    );
    return this.hasExperiment(id);
  }

  get tickets() {
    const textChannels = this.channels.cache.filter(
      (channel) => channel.type == "text"
    );
    return (this.settings.get("tickets.channels", []) as string[])
      .map((id) => textChannels.get(id))
      .filter((channel) => !!channel) as TextChannel[];
  }

  async createTicket(
    author: FireMember,
    subject: string,
    category?: CategoryChannel
  ) {
    if (author.guild?.id != this.id) return "author";
    category =
      category ||
      (this.channels.cache
        .filter((channel) => channel.type == "category")
        .get(this.settings.get("tickets.parent")) as CategoryChannel);
    if (!category) return "disabled";
    const limit = this.settings.get("tickets.limit", 1);
    let channels = (this.settings.get(
      "tickets.channels",
      []
    ) as string[]).map((id) =>
      this.channels.cache
        .filter((channel) => channel.type == "text" && channel.id == id)
        .get(id)
    );
    if (
      channels.filter((channel: TextChannel) =>
        channel?.topic.includes(author.id)
      ).length >= limit
    )
      return "limit";
    const words = (this.client.getCommand("ticket") as Tickets).words;
    let increment = this.settings.get("tickets.increment", 0) as number;
    const variables = {
      "{increment}": increment.toString() as string,
      "{name}": author.user.username,
      "{id}": author.id,
      "{word}": this.client.util.randomItem(words) as string,
      "{uuid}": uuidv4().slice(0, 4),
      "{crab}": "🦀", // CRAB IN DA CODE
    };
    let name = this.settings.get(
      "tickets.name",
      "ticket-{increment}"
    ) as string;
    for (const [key, value] of Object.entries(variables)) {
      name = name.replace(key, value);
    }
    name = name.replace(/crab/gim, "🦀");
    this.settings.set("tickets.increment", ++increment);
    const ticket = await this.channels
      .create(name.slice(0, 50), {
        parent: category,
        permissionOverwrites: [
          ...category.permissionOverwrites.array(),
          { id: author.id, allow: ["VIEW_CHANNEL", "SEND_MESSAGES"] },
          {
            id: this.me.id,
            allow: [
              "VIEW_CHANNEL",
              "SEND_MESSAGES",
              "MANAGE_CHANNELS",
              "MANAGE_ROLES",
            ],
          },
          {
            id: this.roles.everyone.id,
            deny: ["VIEW_CHANNEL"],
          },
        ],
        topic: this.language.get(
          "TICKET_CHANNEL_TOPIC",
          author.toString(),
          author.id,
          subject
        ) as string,
        reason: this.language.get(
          "TICKET_CHANNEL_TOPIC",
          author.toString(),
          author.id,
          subject
        ) as string,
      })
      .catch((e: Error) => e);
    if (ticket instanceof Error) return ticket;
    const embed = new MessageEmbed()
      .setTitle(this.language.get("TICKET_OPENER_TILE", author.toString()))
      .setTimestamp()
      .setColor(author.displayColor || "#ffffff")
      .addField(this.language.get("SUBJECT"), subject);
    const opener = await ticket.send(embed).catch(() => {});
    channels.push(ticket);
    this.settings.set(
      "tickets.channels",
      channels.map((channel) => channel && channel.id)
    );
    this.client.emit("ticketCreate", author, ticket, opener);
    return ticket;
  }

  async closeTicket(channel: TextChannel, author: FireMember, reason: string) {
    if (channel instanceof FakeChannel) channel = channel.real as TextChannel;
    if (author instanceof FireUser)
      author = (await this.members.fetch(author).catch(() => {})) as FireMember;
    if (!author) return "forbidden";
    let channels = (this.settings.get(
      "tickets.channels",
      []
    ) as string[]).map((id) =>
      this.channels.cache
        .filter((channel) => channel.type == "text" && channel.id == id)
        .get(id)
    );
    if (!channels.includes(channel)) return "nonticket";
    if (
      !author.permissions.has("MANAGE_CHANNELS") &&
      !channel.topic.includes(author.id)
    )
      return "forbidden";
    channels = channels.filter((c) => c && c.id != channel.id);
    this.settings.set(
      "tickets.channels",
      channels.map((c) => c.id)
    );
    let transcript: string[] = [];
    (
      await channel.messages.fetch({ limit: 100 }).catch(() => [])
    ).forEach((message: FireMessage) =>
      transcript.push(
        `${message.author} (${
          message.author.id
        }) at ${message.createdAt.toLocaleString(this.language.id)}\n${
          message.content ||
          message.embeds[0]?.description ||
          message.attachments.first()?.proxyURL ||
          `${message.embeds[0]?.fields[0]?.name} | ${message.embeds[0]?.fields[0]?.value}`
        }`
      )
    );
    transcript = transcript.reverse();
    transcript.push(
      `${transcript.length} messages${
        transcript.length == 100
          ? " (only the last 100 can be fetched due to Discord limitations)"
          : ""
      }, closed by ${author}`
    );
    const buffer = Buffer.from(transcript.join("\n\n"));
    const id = getIDMatch(channel.topic, true);
    let creator = author;
    if (id) {
      creator = (await this.members.fetch(id).catch(() => {})) as FireMember;
      if (creator)
        await creator
          .send(
            creator.language.get("TICKET_CLOSE_TRANSCRIPT", this.name, reason),
            {
              files: [
                new MessageAttachment(buffer, `${channel.name}-transcript.txt`),
              ],
            }
          )
          .catch(() => {});
      else creator = author;
    }
    const log =
      (this.channels.cache.get(
        this.settings.get("tickets.transcript_logs")
      ) as TextChannel) ||
      (this.channels.cache.get(this.settings.get("log.action")) as TextChannel);
    const embed = new MessageEmbed()
      .setTitle(this.language.get("TICKET_CLOSER_TITLE", channel.name))
      .setTimestamp()
      .setColor(author.displayColor || "#ffffff")
      .addField(
        this.language.get("TICKET_CLOSER_CLOSED_BY"),
        `${author} (${author.id})`
      )
      .addField(this.language.get("REASON"), reason);
    await log
      ?.send({
        embed,
        files:
          channel.parentID == "755796036198596688"
            ? []
            : [new MessageAttachment(buffer, `${channel.name}-transcript.txt`)],
      })
      .catch(() => {});
    this.client.emit("ticketClose", creator);
    return (await channel
      .delete(this.language.get("TICKET_CLOSE_REASON") as string)
      .catch((e: Error) => e)) as TextChannel | Error;
  }

  async createModLogEntry(
    user: FireUser | FireMember,
    moderator: FireMember,
    type: ModLogType,
    reason: string
  ) {
    const date = new Date().toLocaleString(this.language.id);
    const caseID = nanoid();
    const entryResult = await this.client.db
      .query(
        "INSERT INTO modlogs (gid, uid, modid, reason, date, type, caseid) VALUES ($1, $2, $3, $4, $5, $6, $7);",
        [this.id, user.id, moderator.id, reason, date, type, caseID]
      )
      .catch(() => {});
    if (!entryResult) return false;
    // amazing success detection
    else if (entryResult.status.startsWith("INSERT")) return caseID;
    return false;
  }

  async deleteModLogEntry(caseID: string) {
    const entryResult = await this.client.db
      .query("DELETE FROM modlogs WHERE gid=$1 AND caseid=$2;", [
        this.id,
        caseID,
      ])
      .catch(() => {});
    if (!entryResult) return false;
    else if (entryResult.status.startsWith("DELETE")) return true;
    return false;
  }

  async unban(
    user: FireUser,
    reason: string,
    moderator: FireMember,
    channel?: TextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const ban = await this.fetchBan(user).catch(() => {});
    if (!ban) return "no_ban";
    const logEntry = await this.createModLogEntry(
      user,
      moderator,
      "unban",
      reason
    ).catch(() => {});
    if (!logEntry) return "entry";
    const unbanned = await this.members.unban(user, reason).catch(() => {});
    if (!unbanned) {
      const deleted = await this.deleteModLogEntry(logEntry).catch(() => false);
      return deleted ? "unban" : "unban_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp()
      .setAuthor(
        this.language.get("UNBAN_LOG_AUTHOR", user.toString()),
        user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.language.get("MODERATOR"), moderator.toString())
      .addField(this.language.get("REASON"), reason)
      .setFooter(`${user.id} | ${moderator.id}`);
    await this.modLog(embed, "unban").catch(() => {});
    if (channel)
      return await channel
        .send(
          this.language.get(
            "UNBAN_SUCCESS",
            Util.escapeMarkdown(user.toString()),
            Util.escapeMarkdown(this.name)
          )
        )
        .catch(() => {});
  }

  async block(
    blockee: FireMember | Role,
    reason: string,
    moderator: FireMember,
    channel: TextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    let logEntry: string | false | void;
    if (blockee instanceof FireMember) {
      logEntry = await this.createModLogEntry(
        blockee,
        moderator,
        "block",
        reason
      ).catch(() => {});
      if (!logEntry) return "entry";
    }
    const overwrite: PermissionOverwriteOption = {
      SEND_MESSAGES: false,
      ADD_REACTIONS: false,
    };
    const blocked = await channel
      .updateOverwrite(blockee, overwrite, reason)
      .catch(() => {});
    if (!blocked) {
      let deleted = true; // ensures "block" is used if logEntry doesn't exist
      if (logEntry)
        deleted = await this.deleteModLogEntry(logEntry).catch(() => false);
      return deleted ? "block" : "block_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor(
        blockee instanceof FireMember
          ? blockee.displayHexColor
          : null || "#E74C3C"
      )
      .setTimestamp()
      .setAuthor(
        this.language.get(
          "BLOCK_LOG_AUTHOR",
          blockee instanceof FireMember ? blockee.toString() : blockee.name
        ),
        blockee instanceof FireMember
          ? blockee.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : this.iconURL({ size: 2048, format: "png", dynamic: true }),
        "https://static.inv.wtf/blocked.gif" // hehe
      )
      .addField(this.language.get("MODERATOR"), moderator.toString())
      .addField(this.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await this.modLog(embed, "block").catch(() => {});
    return await channel
      .send(
        this.language.get(
          "BLOCK_SUCCESS",
          Util.escapeMarkdown(
            blockee instanceof FireMember ? blockee.toString() : blockee.name
          )
        )
      )
      .catch(() => {});
  }

  async unblock(
    unblockee: FireMember | Role,
    reason: string,
    moderator: FireMember,
    channel: TextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    let logEntry: string | false | void;
    if (unblockee instanceof FireMember) {
      logEntry = await this.createModLogEntry(
        unblockee,
        moderator,
        "unblock",
        reason
      ).catch(() => {});
      if (!logEntry) return "entry";
    }
    const overwrite: PermissionOverwriteOption = {
      SEND_MESSAGES: null,
      ADD_REACTIONS: null,
    };
    const unblocked = await channel
      .updateOverwrite(unblockee, overwrite, reason)
      .catch(() => {});
    if (
      channel.permissionOverwrites.get(unblockee.id)?.allow.bitfield == 0 &&
      channel.permissionOverwrites.get(unblockee.id)?.deny.bitfield == 0 &&
      unblockee.id != this.roles.everyone.id
    )
      await channel.permissionOverwrites
        .get(unblockee.id)
        .delete()
        .catch(() => {}); // this doesn't matter *too* much
    if (!unblocked) {
      let deleted = true; // ensures "unblock" is used if logEntry doesn't exist
      if (logEntry)
        deleted = await this.deleteModLogEntry(logEntry).catch(() => false);
      return deleted ? "unblock" : "unblock_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor(
        unblockee instanceof FireMember
          ? unblockee.displayHexColor
          : null || "#2ECC71"
      )
      .setTimestamp()
      .setAuthor(
        this.language.get(
          "UNBLOCK_LOG_AUTHOR",
          unblockee instanceof FireMember
            ? unblockee.toString()
            : unblockee.name
        ),
        unblockee instanceof FireMember
          ? unblockee.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : this.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.language.get("MODERATOR"), moderator.toString())
      .addField(this.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await this.modLog(embed, "unblock").catch(() => {});
    return await channel
      .send(
        this.language.get(
          "UNBLOCK_SUCCESS",
          Util.escapeMarkdown(
            unblockee instanceof FireMember
              ? unblockee.toString()
              : unblockee.name
          )
        )
      )
      .catch(() => {});
  }
}

Structures.extend("Guild", () => FireGuild);
