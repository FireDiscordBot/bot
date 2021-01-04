import {
  Util,
  Guild,
  Structures,
  TextChannel,
  MessageEmbed,
  CategoryChannel,
  MessageAttachment,
  MessageEmbedOptions,
} from "discord.js";
import { ActionLogType, ModLogType } from "../util/constants";
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

export class FireGuild extends Guild {
  settings: GuildSettings;
  tags: GuildTagManager;
  owner: FireMember;
  client: Fire;

  constructor(client: Fire, data: object) {
    super(client, data);
    this.settings = new GuildSettings(client, this);
    this.tags = new GuildTagManager(client, this);
  }

  get language() {
    return this.client.getLanguage(
      this.settings.get("utils.language", "en-US")
    );
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
    const icon = this.iconURL({
      format: "png",
      size: 128,
      dynamic: true,
    });
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
    type?: ActionLogType
  ) {
    const channel = this.channels.cache.get(this.settings.get("log.action"));
    if (!channel || channel.type != "text") return;
    return await (channel as TextChannel).send(log).catch(() => {});
  }

  async modLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type?: ModLogType
  ) {
    const channel = this.channels.cache.get(
      this.settings.get("log.moderation")
    );
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
    return (this.settings.get("tickets.channels", []) as string[]).map((id) =>
      this.channels.cache
        .filter((channel) => channel.type == "text" && channel.id == id)
        .get(id)
    ) as TextChannel[];
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
      .setTimestamp(new Date())
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
    if (this.id == "755794954743185438")
      this.client.console.info(
        `[Sk1er] Closing ticket ${channel.name} with reason ${reason} by request of ${author}...`
      );
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
      .setTimestamp(new Date())
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
    if (this.id == "755794954743185438")
      this.client.console.info(
        `[Sk1er] Emitting ticketClose for ticket ${channel.name}...`
      );
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
      const deleted = await this.deleteModLogEntry(logEntry);
      return deleted ? "unban" : "unban_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor("#E74C3C")
      .setTimestamp(new Date())
      .setAuthor(
        this.language.get("UNBAN_LOG_AUTHOR", this.toString()),
        user.avatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .addField(this.language.get("MODERATOR"), `${moderator}`)
      .addField(this.language.get("REASON"), reason)
      .setFooter(`${this.id} | ${moderator.id}`);
    await this.modLog(embed).catch(() => {});
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
}

Structures.extend("Guild", () => FireGuild);
