import { TextChannel, GuildMember, User, Role } from "discord.js";
import * as solutions from "../../sk1er_solutions.json";
import { FireGuild } from "../../lib/extensions/guild";
import { Module } from "../../lib/util/module";
import * as Centra from "centra";
import * as moment from "moment";

interface Regexes {
  reupload: RegExp;
  noRaw: RegExp;
  secrets: RegExp;
  email: RegExp;
  url: RegExp;
  home: RegExp;
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
  constructor() {
    super("sk1er");
    this.guildId = "411619823445999637";
    this.nitroId = "585534346551754755";
    this.uuidCache = new Map();
    this.statusCheck = setInterval(async () => this.statusChecker(), 1800000);
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
  }

  async unload() {
    clearInterval(this.statusCheck);
  }

  async nameToUUID(player: string) {
    if (this.uuidCache.has(player)) return this.uuidCache.get(player);
    const profileReq = await Centra(
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
      const bots = {
        "444871677176709141": "747786560123961443",
        "234395307759108106": "747787115974230156",
        "172002275412279296": "747787792402219128",
        "689373971572850842": "747788002738176110",
        "155149108183695360": "747786691074457610",
      };
      const commands: TextChannel = this.guild.channels.cache.get(
        "411620555960352787"
      ) as TextChannel;
      const pins = await commands.messages.fetchPinned();
      pins.forEach(async (pin) => {
        if (!(pin.author.id in bots)) return;
        if (
          moment.duration(moment().diff(moment(pin.createdAt))).asHours() > 10
        ) {
          try {
            await pin.unpin({
              reason: "Incident has lasted more than 10 hours",
            });
          } catch {}
        }
      });
    } catch {}
  }

  async getUUID(user: GuildMember | User) {
    const rows = (
      await this.client.db.query("SELECT uuid FROM modcore WHERE uid=$1;", [
        user.id,
      ])
    ).rows;
    if (rows[0]) return rows[0][0]?.toString();
    else return null;
  }

  async setUUID(user: GuildMember | User, uuid: string) {
    const current = await this.getUUID(user);
    try {
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
    } catch {
      return false;
    }
  }

  async removeNitroPerks(user: GuildMember | User) {
    const uuid = await this.getUUID(user);
    if (!uuid) return false;
    const nitroReq = await Centra(
      `https://api.modcore.sk1er.club/nitro/${uuid}/false`
    )
      .header("secret", this.modcoreHeaders.secret)
      .send();
    if (nitroReq.statusCode != 200) return false;
    else return true;
  }

  async giveNitroPerks(user: GuildMember | User, ign: string) {
    const uuid = await this.nameToUUID(ign);
    if (!uuid) return false;
    const setUUID = await this.setUUID(user, uuid);
    if (!setUUID) return false;
    const nitroReq = await Centra(
      `https://api.modcore.sk1er.club/nitro/${uuid}/true`
    )
      .header("secret", this.modcoreHeaders.secret)
      .send();
    if (nitroReq.statusCode != 200) return false;
    else return true;
  }

  public getSolutions(log: string) {
    let solutions: string[] = [];
    Object.keys(solutions).forEach((err) => {
      if (log.includes(err)) solutions.push(`- ${solutions[err]}`);
    });
    if (log.includes("OptiFine_1.8.9_HD_U") && !log.match(/_I7|_L5/im))
      solutions.push("- Update Optifine to either I7 or L5");
    return solutions.length
      ? `Possible solutions:\n${solutions.join("\n")}`
      : "";
  }
}
