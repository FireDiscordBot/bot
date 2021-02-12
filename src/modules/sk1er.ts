import {
  CategoryChannel,
  MessageReaction,
  TextChannel,
  Role,
} from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Module } from "@fire/lib/util/module";
import { createWriteStream } from "fs";
import * as archiver from "archiver";
import * as centra from "centra";
import * as moment from "moment";

interface Regexes {
  reupload: RegExp;
  noRaw: RegExp;
  secrets: RegExp;
  email: RegExp;
  url: RegExp;
  home: RegExp;
  settingUser: RegExp;
}

export default class Sk1er extends Module {
  guild: FireGuild;
  supportGuild: FireGuild;
  guildId: string;
  supportGuildId: string;
  supportMessageId: string;
  supportMessage: FireMessage;
  supportChannelId: string;
  supportChannel: TextChannel;
  nitro: Role;
  nitroId: string;
  modcoreHeaders: { secret: string };
  regexes: Regexes;
  logText: string[];
  bots: any;
  statusCheck: NodeJS.Timeout;
  descriptionUpdate: NodeJS.Timeout;

  constructor() {
    super("sk1er");
    this.guildId = "411619823445999637";
    this.supportGuildId = "755794954743185438";
    this.supportMessageId = "755817441581596783";
    this.supportChannelId = "755796557692928031";
    this.nitroId = "585534346551754755";
    this.statusCheck = setInterval(
      async () => await this.statusChecker(),
      1800000
    );
    this.descriptionUpdate = setInterval(
      async () => await this.descriptionUpdater(),
      300000
    );
    this.bots = {
      "444871677176709141": "747786560123961443",
      "234395307759108106": "747787115974230156",
      "172002275412279296": "747787792402219128",
      "689373971572850842": "747788002738176110",
      "155149108183695360": "747786691074457610",
    };
  }

  async init() {
    if (this.client.readyAt) await this.ready();
    else this.client.once("ready", async () => this.ready());
  }

  async ready() {
    this.guild = this.client.guilds.cache.get(this.guildId) as FireGuild;
    this.supportGuild = this.client.guilds.cache.get(
      this.supportGuildId
    ) as FireGuild;
    if ([!this.guild, !this.supportGuild].every((value) => value == true))
      return this.remove();
    this.nitro = this.guild?.roles.cache.get(this.nitroId);
    this.supportChannel = this.client.channels.cache.get(
      this.supportChannelId
    ) as TextChannel;
    this.modcoreHeaders = { secret: process.env.MODCORE_SECRET };
    if (this.guild) {
      await this.statusChecker();
      await this.descriptionUpdater();
      await this.nitroChecker();
    }
  }

  async unload() {
    clearInterval(this.statusCheck);
    clearInterval(this.descriptionUpdate);
  }

  async statusChecker() {
    try {
      const hoursDifferenceSince = (date: Date) =>
        moment.duration(moment().diff(moment(date))).asHours();

      const commandsChannel = this.guild.channels.cache.get(
        "411620555960352787"
      ) as TextChannel;

      const pinnedMessages = await commandsChannel.messages.fetchPinned();
      pinnedMessages
        .filter(
          (message) =>
            Object.keys(this.bots).includes(message.author.id) &&
            hoursDifferenceSince(message.createdAt) > 10
        )
        .forEach((message) => {
          message
            .unpin({
              reason: "Incident has lasted more than 10 hours",
            })
            .catch(() => {});
        });
    } catch {}
  }

  async descriptionUpdater() {
    try {
      const responses = await Promise.all([
        centra("https://api.sk1er.club/mods_analytics").send(),
        centra("https://api.autotip.pro/counts").send(),
        centra("https://api.hyperium.cc/users").send(),
      ]);
      const jsons = (await Promise.all(
        responses.map((response) => response.json())
      )) as [{ combined_total: number }, { total: number }, { all: number }];
      const count = jsons[0].combined_total + jsons[1].total + jsons[2].all;

      // @ts-ignore
      const newData = await this.client.api
        // @ts-ignore
        .guilds(this.guildId)
        .patch({
          data: {
            description: `The Official Discord for Sk1er & Sk1er Mods (${count.toLocaleString(
              this.guild.language.id
            )} total players)`,
          },
          reason: "Description Updater Task",
        })
        .catch(() => {});

      if (newData)
        // @ts-ignore
        this.client.actions.GuildUpdate.handle(newData);
    } catch {}
  }

  async nitroChecker() {
    let users: string[] = [];
    const modcoreResult = await this.client.db.query(
      "SELECT uid FROM modcore;"
    );
    for await (const row of modcoreResult) {
      users.push(row.get("uid") as string);
    }
    const members = await this.guild.members.fetch({ user: users });
    const memberIds = members.map((m) => m.id);
    users = users.filter((u) => !memberIds.includes(u));
    const membersLoop = async () => {
      members.forEach(async (member: FireMember) => {
        if (!member.roles.cache.has(this.nitroId) && !member.isSuperuser()) {
          this.client.console.warn(
            `[Sk1er] Removing nitro perks from ${member} due to lack of booster role`
          );
          const removed = await this.removeNitroPerks(member).catch(() => {});
          if (!removed || typeof removed == "number")
            this.client.console.error(
              `[Sk1er] Failed to remove nitro perks from ${member}${
                typeof removed == "number"
                  ? " with status code " + removed.toString()
                  : ""
              }`
            );
          else if (typeof removed == "boolean" && removed)
            (this.guild.channels.cache.get(
              "411620457754787841"
            ) as TextChannel).send(
              this.guild.language.get(
                "SK1ER_NITRO_PERKS_REMOVED",
                member.toMention()
              ),
              { allowedMentions: { users: [member.id] } }
            );
        }
      });
    };
    await membersLoop(); // Ensures foreach finishes before continuing
    if (users.length) {
      users.forEach(async (id) => {
        this.client.console.warn(
          `[Sk1er] Removing nitro perks from ${id} due to lack of existence`
        );
        const user = (await this.client.users
          .fetch(id)
          .catch(() => {})) as FireUser;
        if (user) {
          const removed = await this.removeNitroPerks(user).catch(() => {});
          if (!removed || typeof removed == "number")
            this.client.console.error(
              `[Sk1er] Failed to remove nitro perks from ${user}${
                typeof removed == "number"
                  ? " with status code " + removed.toString()
                  : ""
              }`
            );
          else if (typeof removed == "boolean" && removed)
            (this.guild.channels.cache.get(
              "411620457754787841"
            ) as TextChannel).send(
              this.guild.language.get(
                "SK1ER_NITRO_PERKS_REMOVED_LEFT",
                user.toString()
              )
            );
        }
      });
    }
  }

  async handleSupportReaction(reaction: MessageReaction, user: FireUser) {
    const member = (await this.supportGuild.members.fetch(user)) as FireMember;
    if (!member) return; // how
    const emoji = reaction.emoji.name;
    try {
      await reaction.users.remove(user);
    } catch {}
    if (emoji == "🖥️") {
      const category = this.supportGuild.channels.cache.get(
        "755795962462732288"
      ) as CategoryChannel;
      if (!category) return "nocategory";
      return await this.supportGuild.createTicket(
        member,
        "General Support",
        category
      );
    }
    if (emoji == "💸") {
      const category = this.supportGuild.channels.cache.get(
        "755796036198596688"
      ) as CategoryChannel;
      if (!category) return "nocategory";
      return await this.supportGuild.createTicket(
        member,
        "Purchase Support",
        category
      );
    }
    if (emoji == "🐛") {
      const category = this.supportGuild.channels.cache.get(
        "755795994855211018"
      ) as CategoryChannel;
      if (!category) return "nocategory";
      return await this.supportGuild.createTicket(
        member,
        "Bug Report",
        category
      );
    }
  }

  async getUUID(user: FireMember | FireUser) {
    const rows = (
      await this.client.db.query("SELECT uuid FROM modcore WHERE uid=$1;", [
        user.id,
      ])
    ).rows;

    return rows[0] ? rows[0][0]?.toString() : null;
  }

  async setUUID(user: FireMember | FireUser, uuid: string) {
    try {
      const current = await this.getUUID(user);
      if (current)
        await this.client.db.query("UPDATE modcore SET uuid=$1 WHERE uid=$2;", [
          uuid,
          user.id,
        ]);
      else
        await this.client.db.query(
          "INSERT INTO modcore (uid, uuid) VALUES ($1, $2);",
          [user.id, uuid]
        );
      return true;
    } catch {
      return false;
    }
  }

  async removeNitroPerks(user: FireMember | FireUser) {
    const uuid = await this.getUUID(user);
    if (!uuid) return false;

    const nitroReq = await centra(
      `https://api.modcore.net/api/v1/nitro/${uuid}/false`,
      "POST"
    )
      .header("secret", this.modcoreHeaders.secret)
      .send();

    if (nitroReq.statusCode == 200) {
      const result = await this.client.db.query(
        "DELETE FROM modcore WHERE uid=$1;",
        [user.id]
      );
      if (result.status != "DELETE 0") return true;
      else return false;
    } else return nitroReq.statusCode;
  }

  async giveNitroPerks(user: FireMember | FireUser, ign: string) {
    const uuid = await this.client.util.nameToUUID(ign);
    if (!uuid) return false;

    const setUUID = await this.setUUID(user, uuid);
    if (!setUUID) return false;

    const nitroReq = await centra(
      `https://api.modcore.net/api/v1/nitro/${uuid}/true`,
      "POST"
    )
      .header("secret", this.modcoreHeaders.secret)
      .send();

    return nitroReq.statusCode == 200;
  }

  async createModcoreZip() {
    const out = createWriteStream("/var/www/sharex/uploads/modcore.zip");
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    archive.pipe(out);

    const versionsReq = await (
      await centra("https://api.modcore.net/api/v1/versions").send()
    ).json();
    const current = versionsReq.versions["1.8.9"];
    if (!current) return false;
    const modcore = (
      await centra(
        `https://static.sk1er.club/repo/mods/modcore/${current}/1.8.9/ModCore-${current}%20(1.8.9).jar`
      ).send()
    ).body;
    archive.append(modcore, { name: `Sk1er Modcore-${current} (1.8.9).jar` });
    archive.append(JSON.stringify({ "1.8.9": current }), {
      name: "metadata.json",
    });

    await archive.finalize();
    out.close();
    return "https://static.inv.wtf/modcore.zip";
  }

  async checkBotStatus(message: FireMessage) {
    if (!Object.values(this.bots).includes(message.author.id)) return;

    switch (message.author.id) {
      // Fire Status
      // case "747786560123961443": {
      //   if (message.embeds[0].fields[0].name == "Resolved" && message.pinned)
      //     await message
      //       .unpin({ reason: "Incident is resolved" })
      //       .catch(() => {});
      //   else if (
      //     !message.pinned &&
      //     message.embeds[0].description != "New scheduled maintenance"
      //   )
      //     await message
      //       .pin({ reason: "New incident" })
      //       .catch((reason) =>
      //         this.client.console.warn(
      //           `[Sk1er] Failed to pin Fire status update; ${reason}`
      //         )
      //       );
      //   break;
      // }
      // Groovy Status
      case "747787115974230156": {
        const emojiRe = /<a?:([a-zA-Z0-9\_]+):[0-9]+>/im;
        const online = emojiRe
          .exec(message.content)
          .filter((value) => value.includes("online"));
        if (online.length && message.pinned)
          await message
            .unpin({ reason: "Incident is resolved" })
            .then(() => {});
        else if (!message.pinned)
          await message
            .pin({ reason: "New incident" })
            .catch((reason) =>
              this.client.console.warn(
                `[Sk1er] Failed to pin Groovy status update; ${reason}`
              )
            );
        break;
      }
      // S-tatsu-s ;)
      case "747787792402219128": {
        if (message.content.toLowerCase().includes("resolved"))
          await message
            .unpin({ reason: "Incident is resolved" })
            .then(() => {});
        else if (!message.pinned)
          await message
            .pin({ reason: "New incident" })
            .catch((reason) =>
              this.client.console.warn(
                `[Sk1er] Failed to pin Tatsu status update; ${reason}`
              )
            );
        break;
      }
      // Lunar Status
      case "747788002738176110": {
        if (message.content.toLowerCase().includes("resolved"))
          await message
            .unpin({ reason: "Incident is resolved" })
            .then(() => {});
        else if (!message.pinned)
          await message
            .pin({ reason: "New incident" })
            .catch((reason) =>
              this.client.console.warn(
                `[Sk1er] Failed to pin Lunar status update; ${reason}`
              )
            );
        break;
      }
      // Dyno Status
      // (this is a weird one, they don't always edit the message but post a new one instead)
      case "747786691074457610": {
        const isLikelyResolved = Boolean(
          message.content
            .toLowerCase()
            .split(" ")
            .filter((m) => ["dynoonline", "recovered"].includes(m)).length
        );
        if (isLikelyResolved)
          (await message.channel.messages.fetchPinned()).forEach(
            async (msg) => {
              if (msg.author.id == message.author.id) await msg.unpin();
            }
          );
        else
          await message
            .pin({ reason: "New(?) incident" })
            .catch((reason) =>
              this.client.console.warn(
                `[Sk1er] Failed to pin Dyno status update; ${reason}`
              )
            );
        break;
      }
    }
  }
}
