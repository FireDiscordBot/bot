import { createWriteStream, unlink } from "fs";

import {
  GuildMember,
  MessageAttachment,
  Role,
  TextChannel,
  User,
} from "discord.js";
import * as archiver from "archiver";
import * as centra from "centra";
import * as moment from "moment";

import { FireMessage } from "../../lib/extensions/message";
import * as solutions from "../../sk1er_solutions.json";
import { FireGuild } from "../../lib/extensions/guild";
import { Module } from "../../lib/util/module";

interface Regexes {
  reupload: RegExp;
  noRaw: RegExp;
  secrets: RegExp;
  email: RegExp;
  url: RegExp;
  home: RegExp;
  settingUser: RegExp;
}

interface MojangProfile {
  name: string;
  id: string;
}

export default class Sk1er extends Module {
  guild: FireGuild;
  guildId: string;
  nitro: Role;
  nitroId: string;
  modcoreHeaders: { secret: string };
  regexes: Regexes;
  logText: string[];
  uuidCache: Map<string, string>;
  statusCheck: NodeJS.Timeout;
  descriptionUpdate: NodeJS.Timeout;

  constructor() {
    super("sk1er");
    this.guildId = "411619823445999637";
    this.nitroId = "585534346551754755";
    this.uuidCache = new Map();
    this.statusCheck = setInterval(
      async () => await this.statusChecker(),
      1800000
    );
    this.descriptionUpdate = setInterval(
      async () => await this.descriptionUpdater(),
      300000
    );
  }

  async init() {
    if (this.client.readyAt) await this.ready();
    else this.client.once("ready", async () => this.ready());
  }

  async ready() {
    this.guild = this.client.guilds.cache.get(this.guildId) as FireGuild;
    this.nitro = this.guild.roles.cache.get(this.nitroId);
    this.modcoreHeaders = { secret: process.env.MODCORE_SECRET };
    this.regexes = {
      reupload: /(?:http(?:s)?:\/\/)?(paste.ee|pastebin.com|hastebin.com|hasteb.in)\/(?:raw\/|p\/)?(\w+)/im,
      noRaw: /(?:http(?:s)?:\/\/)?(?:justpaste).(?:it)\/(\w+)/im,
      secrets: /(club.sk1er.mods.levelhead.auth.MojangAuth|api.sk1er.club\/auth|LoginPacket|SentryAPI.cpp|"authHash":|"hash":"|--accessToken|\(Session ID is token:|Logging in with details: |Server-Hash: |Checking license key :)/im,
      email: /[a-zA-Z0-9_.+-]{1,50}@[a-zA-Z0-9-]{1,50}\.[a-zA-Z0-9-.]{1,10}/im,
      url: /(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/im,
      home: /(\/Users\/\w+|\/home\/\w+|C:\\Users\\\w+)/im,
      settingUser: /\[Client thread\/INFO]: Setting user: (\w{1,16})/im,
    };
    this.logText = [
      "net.minecraft.launchwrapper.Launch",
      "# A fatal error has been detected by the Java Runtime Environment:",
      "---- Minecraft Crash Report ----",
      "A detailed walkthrough of the error",
      "launchermeta.mojang.com",
      "Running launcher core",
      "Native Launcher Version:",
      "[Client thread/INFO]: Setting user:",
      "[Client thread/INFO]: (Session ID is",
      "MojangTricksIntelDriversForPerformance",
      "[DefaultDispatcher-worker-1] INFO Installer",
      "[DefaultDispatcher-worker-1] ERROR Installer",
      "[Client thread/INFO]:",
    ];
    await this.statusChecker();
    await this.descriptionUpdater();
  }

  async unload() {
    clearInterval(this.statusCheck);
    clearInterval(this.descriptionUpdate);
  }

  async nameToUUID(player: string) {
    if (this.uuidCache.has(player)) return this.uuidCache.get(player);
    const profileReq = await centra(
      `https://api.mojang.com/users/profiles/minecraft/${player}`
    ).send();
    if (profileReq.statusCode == 200) {
      const profile: MojangProfile = await profileReq.json();
      this.uuidCache.set(player, profile.id);
      return profile.id;
    } else return null;
  }

  async statusChecker() {
    try {
      const hoursDifferenceSince = (date: Date) =>
        moment.duration(moment().diff(moment(date))).asHours();

      const bots = {
        "444871677176709141": "747786560123961443",
        "234395307759108106": "747787115974230156",
        "172002275412279296": "747787792402219128",
        "689373971572850842": "747788002738176110",
        "155149108183695360": "747786691074457610",
      };
      const commandsChannel = this.guild.channels.cache.get(
        "411620555960352787"
      ) as TextChannel;

      const pinnedMessages = await commandsChannel.messages.fetchPinned();
      pinnedMessages
        .filter(
          (message) =>
            Object.keys(bots).includes(message.author.id) &&
            hoursDifferenceSince(message.createdAt) > 10
        )
        .forEach((message) => {
          message
            .unpin({
              reason: "Incident has lasted more than 10 hours",
            })
            .catch((error) => {});
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
            description: `The Official Discord for Sk1er & Sk1er Mods (${count.toLocaleString()} total players)`,
          },
          reason: "Description Updater Task",
        });

      // @ts-ignore
      this.client.actions.GuildUpdate.handle(newData);
    } catch {}
  }

  async getUUID(user: GuildMember | User) {
    const rows = (
      await this.client.db.query("SELECT uuid FROM modcore WHERE uid=$1;", [
        user.id,
      ])
    ).rows;

    return rows[0] ? rows[0][0]?.toString() : null;
  }

  async setUUID(user: GuildMember | User, uuid: string) {
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

  async removeNitroPerks(user: GuildMember | User) {
    const uuid = await this.getUUID(user);
    if (!uuid) return false;

    const nitroReq = await centra(
      `https://api.modcore.sk1er.club/nitro/${uuid}/false`
    )
      .header("secret", this.modcoreHeaders.secret)
      .send();

    return nitroReq.statusCode === 200;
  }

  async giveNitroPerks(user: GuildMember | User, ign: string) {
    const uuid = await this.nameToUUID(ign);
    if (!uuid) return false;

    const setUUID = await this.setUUID(user, uuid);
    if (!setUUID) return false;

    const nitroReq = await centra(
      `https://api.modcore.sk1er.club/nitro/${uuid}/true`
    )
      .header("secret", this.modcoreHeaders.secret)
      .send();

    return nitroReq.statusCode === 200;
  }

  public getSolutions(log: string) {
    const currentSolutions: string[] = [];

    Object.keys(solutions).forEach((err) => {
      if (
        log.includes(err) &&
        !currentSolutions.includes(`- ${solutions[err]}`)
      )
        currentSolutions.push(`- ${solutions[err]}`);
    });

    if (log.includes("OptiFine_1.8.9_HD_U") && !log.match(/_I7|_L5/im))
      currentSolutions.push("- Update Optifine to either I7 or L5");

    return currentSolutions.length
      ? `Possible solutions:\n${currentSolutions.join("\n")}`
      : "";
  }

  async checkLogs(message: FireMessage) {
    if (message.guild.id != this.guildId) return;

    let content = message.content;

    if (this.regexes.noRaw.test(content)) {
      try {
        await message.delete({
          reason: "Unable to reupload log from source to hastebin",
        });
      } catch {}
      return await message.channel.send(
        message.language.get("SK1ER_NO_REUPLOAD", message.author),
        {
          allowedMentions: { users: [message.author.id] },
        }
      );
    }

    const reupload = this.regexes.reupload.exec(content);
    if (reupload != null && reupload.length >= 3) {
      const domain = reupload[1];
      const key = reupload[2];
      const rawReq = await centra(
        `https://${domain}/${domain.includes("paste.ee") ? "r" : "raw"}/${key}`
      ).send();
      if (rawReq.statusCode.toString()[0] != "2") {
        return await message.channel.send(
          message.language.get("SK1ER_REUPLOAD_FETCH_FAIL", domain)
        );
      } else {
        const text = await rawReq.text();
        content = content.replace(this.regexes.reupload, text);
      }
    }

    if (!message.attachments.size && content.length > 350)
      return await this.handleLogText(
        message,
        content,
        reupload != null ? "sent a paste containing" : "sent"
      );

    message.attachments
      .filter(
        (attachment) =>
          attachment.name.endsWith(".log") || attachment.name.endsWith(".txt")
      )
      .forEach(async (attach) => {
        try {
          const text = await (await centra(attach.url).send()).text();
          await this.handleLogText(message, text, "uploaded");
        } catch {
          await message.channel.send(
            message.language.get("SK1ER_LOG_READ_FAIL")
          );
        }
      });
  }

  async handleLogText(message: FireMessage, text: string, msgType: string) {
    const lines = text.split("\n");
    if (
      /ModCoreInstaller:download:\d{1,4}]: MAX: \d+/im.test(
        lines[lines.length - 1]
      )
    ) {
      try {
        await this.createModcoreZip();
        try {
          await message.delete({
            reason: "Removing log and sending Modcore zip",
          });
        } catch {}

        const zipattach = new MessageAttachment("modcore.zip", "modcore.zip");
        await message.channel.send(
          message.language.get("SK1ER_MODCORE_ZIP", message.author),
          {
            allowedMentions: { users: [message.author.id] },
            files: [zipattach],
          }
        );
        unlink("modcore.zip", () => {});
      } catch {}
    }

    text = text
      .replace(this.regexes.email, "[removed email]")
      .replace(this.regexes.home, "USER.HOME");

    this.regexes.url.exec(text)?.forEach((match) => {
      if (!match.includes("sk1er.club"))
        text = text.replace(match, "[removed url]");
    });

    lines.forEach((line) => {
      if (this.regexes.secrets.test(line))
        text = text.replace(line, "[line removed to protect sensitive info]");
    });

    // TODO add filter run replace for log content
    if (this.hasLogText(text)) {
      try {
        const haste = await this.client.haste(text);
        try {
          await message.delete({
            reason: "Removing log and sending haste",
          });
        } catch {}

        let possibleSolutions = this.getSolutions(text);
        const user = this.regexes.settingUser.exec(text);
        if (user?.length) {
          try {
            const uuid = await this.nameToUUID(user[1]);
            if (!uuid) {
              const solution =
                "\n- It seems you may be using a cracked version of Minecraft. If you are, please know that we do not support piracy. Buy the game or don't play the game";
              if (possibleSolutions) possibleSolutions += solution;
              else possibleSolutions = `Possible solutions:${solution}`;
            }
          } catch {}
        }

        return await message.send(
          "SK1ER_LOG_HASTE",
          message.author,
          msgType,
          msgType == "sent" ? message.content : "",
          haste,
          possibleSolutions
        );
      } catch (e) {
        this.client.console.error(e.stack);
      }
    }
  }

  hasLogText(text: string) {
    return this.logText.some((logText) => text.includes(logText));
  }

  async createModcoreZip() {
    const out = createWriteStream("modcore.zip");
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    archive.pipe(out);

    const versions = await (
      await centra("https://api.sk1er.club/modcore_versions").send()
    ).json();
    const current = versions["1.8.9"];
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
  }
}
