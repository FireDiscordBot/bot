import { VanityURL } from "../../lib/interfaces/invwtf";
import { FireGuild } from "../../lib/extensions/guild";
import { Language } from "../../lib/util/language";
import { MessageEmbed, Invite } from "discord.js";
import { Module } from "../../lib/util/module";
import * as centra from "centra";

export default class VanityURLs extends Module {
  blacklisted: string[];

  constructor() {
    super("vanityurls");
  }

  async init() {
    this.blacklisted = [];
    const blacklistResult = await this.client.db.query(
      "SELECT * FROM vanitybl;"
    );
    for await (const blacklist of blacklistResult) {
      this.blacklisted.push(blacklist.get("gid") as string);
    }
  }

  async requestFetch(reason = "No Reason Provided") {
    const fetchReq = await centra(
      this.client.config.dev
        ? "https://test.inv.wtf/fetch"
        : "https://inv.wtf/fetch",
      "PUT"
    )
      .header("User-Agent", "Fire Discord Bot")
      .header("Authorization", process.env.VANITY_KEY)
      .body({ reason }, "json")
      .send();
    if (fetchReq.statusCode != 204)
      this.client.console.warn(
        `Failed to request Vanity URL Fetch with reason: "${reason}"`
      );
  }

  async getVanity(code: string) {
    const vanityReq = await centra(
      this.client.config.dev
        ? `https://test.inv.wtf/api/${code}`
        : `https://inv.wtf/api/${code}`
    )
      .header("User-Agent", "Fire Discord Bot")
      .header("Authorization", process.env.VANITY_KEY)
      .send();
    if (vanityReq.statusCode != 200) return false;
    const vanity = await vanityReq.json();
    if (!vanity.invite) return true;
    return vanity as VanityURL;
  }

  async create(guild: FireGuild, code: string, invite: Invite) {
    if (this.blacklisted.includes(guild.id)) return "blacklisted";
    code = code.toLowerCase();
    const currentResult = await this.client.db
      .query("SELECT code FROM vanity WHERE gid=$1;", [guild.id])
      .first();
    if (!currentResult)
      return await this.client.db
        .query(
          "INSERT INTO vanity (gid, code, invite) VALUES ($1, $2, $3) RETURNING *;",
          [guild.id, code, invite.code]
        )
        .first()
        .catch(() => {});
    else
      return await this.client.db
        .query(
          "UPDATE vanity SET (code, invite) = ($1, $2) WHERE code=$3 RETURNING *;",
          [code, invite.code, currentResult.get("code") as string]
        )
        .first()
        .catch(() => {});
  }

  async delete(code: FireGuild | string) {
    const original = code;
    if (code instanceof FireGuild) code = code.id;
    const deleteResult = await this.client.db
      .query(
        "DELETE FROM vanity WHERE code=$1 OR code=$2 OR invite=$1 OR invite=$2 OR gid=$1 RETURNING *;",
        [code, code.toLowerCase()]
      )
      .first()
      .catch(() => {});
    if (deleteResult) this.client.emit("vanityDelete", original, deleteResult);
  }

  async current(guild: FireGuild, code: string, language?: Language) {
    if (!language) language = guild.language;
    const data = await this.getVanity(code);
    if (typeof data == "boolean") return;
    let splash: string;
    if (guild.splash)
      splash = guild
        .splashURL({
          size: 2048,
          format: "png",
        })
        .replace("size=2048", "size=320");
    else if (guild.discoverySplash)
      splash = guild
        .discoverySplashURL({
          size: 2048,
          format: "png",
        })
        .replace("size=2048", "size=320");
    const embed = new MessageEmbed()
      .setAuthor(
        guild.name,
        guild.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .setColor("#2ECC71")
      .addField("URL", `https://inv.wtf/${code}`)
      .setTimestamp(new Date());
    if (guild.premium) {
      embed.addField(language.get("CLICKS"), data.clicks);
      embed.addField(language.get("LINKS"), data.links);
    }
    if (splash) embed.setImage(splash);
    return embed;
  }
}
