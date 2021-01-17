import { Redirect } from "../../lib/interfaces/invwtf";
import { FireGuild } from "../../lib/extensions/guild";
import { Language } from "../../lib/util/language";
import { MessageEmbed, Invite } from "discord.js";
import { Module } from "../../lib/util/module";
import * as centra from "centra";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireUser } from "../../lib/extensions/user";

export default class Redirects extends Module {
  constructor() {
    super("redirects");
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
        `Failed to request redirect fetch with reason: "${reason}"`
      );
  }

  async getRedirect(code: string) {
    const redirectReq = await centra(
      this.client.config.dev
        ? `https://test.inv.wtf/api/${code}`
        : `https://inv.wtf/api/${code}`
    )
      .header("User-Agent", "Fire Discord Bot")
      .header("Authorization", process.env.VANITY_KEY)
      .send();
    if (redirectReq.statusCode != 200) return false;
    const redirect = await redirectReq.json();
    if (!redirect.url) return true;
    return redirect as Redirect;
  }

  async list(user: FireMember | FireUser, code?: string) {
    const result = await this.client.db
      .query(
        code
          ? "SELECT * FROM vanity WHERE uid=$1 AND code=$2 AND redirect IS NOT NULL;"
          : "SELECT * FROM vanity WHERE uid=$1 AND redirect IS NOT NULL;",
        code ? [user.id, code] : [user.id]
      )
      .catch(() => {});

    if (!result) return [];

    return [...result].map((row) => row.get("code") as string);
  }

  async create(user: FireMember | FireUser, code: string, url: string) {
    if (!user.premium) return "premium";
    const limit = 5 * user.premium;
    code = code.toLowerCase();
    const current = await this.list(user);
    if (current.length >= limit && !user.isSuperuser()) return "limit";
    if (!current) {
      const created = await this.client.db
        .query(
          "INSERT INTO vanity (uid, code, redirect) VALUES ($1, $2, $3) RETURNING *;",
          [user.id, code, url]
        )
        .first()
        .catch(() => {});
      if (created)
        await this.requestFetch(
          `Created redirect with code ${code} for ${url}`
        );
      return created;
    } else {
      const updated = await this.client.db
        .query(
          "UPDATE vanity SET (code, redirect) = ($1, $2) WHERE code=$1 AND uid=$3 RETURNING *;",
          [code, url, user.id]
        )
        .first()
        .catch(() => {});
      if (updated)
        await this.requestFetch(`Updated redirect with code ${code} to ${url}`);
      return updated;
    }
  }

  async delete(code: string) {
    return await this.client.db
      .query(
        "DELETE FROM vanity WHERE code=$1 OR code=$2 OR uid=$1 RETURNING *;",
        [code, code.toLowerCase()]
      )
      .first()
      .catch(() => {});
  }

  async current(
    user: FireMember | FireUser,
    code: string,
    language?: Language
  ) {
    if (user instanceof FireMember) user = user.user;
    user = user as FireUser;
    if (!language) language = user.language;
    const data = await this.getRedirect(code);
    if (typeof data == "boolean") return;
    const embed = new MessageEmbed()
      .setAuthor(
        user.username,
        user.displayAvatarURL({ size: 2048, format: "png", dynamic: true })
      )
      .setColor("#2ECC71")
      .addField(language.get("REDIRECT_SHORT_URL"), `https://inv.wtf/${code}`)
      .addField("URL", data.url)
      .addField(language.get("CLICKS"), data.clicks)
      .addField(language.get("LINKS"), data.links)
      .setTimestamp();
    return embed;
  }
}
