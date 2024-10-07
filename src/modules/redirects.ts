import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Redirect } from "@fire/lib/interfaces/invwtf";
import { Language } from "@fire/lib/util/language";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";
import { MessageEmbed } from "discord.js";

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
      .header("User-Agent", this.client.manager.ua)
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
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.VANITY_KEY)
      .send();
    if (redirectReq.statusCode != 200) return false;
    const redirect = await redirectReq.json();
    if (!redirect.url) return true;
    return redirect as Redirect;
  }

  async list(user: FireMember | FireUser) {
    const result = await this.client.db
      .query("SELECT code FROM vanity WHERE uid=$1 AND redirect IS NOT NULL;", [
        user.id,
      ])
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
    const exists = await this.getRedirect(code);
    if (
      (typeof exists == "boolean" && exists) ||
      (typeof exists != "boolean" && exists.uid != user.id)
    )
      return "exists";
    if (!exists) {
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

  async delete(code: string, user: FireMember | FireUser) {
    const deleted = await this.client.db
      .query(
        "DELETE FROM vanity WHERE code=$1 OR code=$2 AND uid=$3 RETURNING *;",
        [code, code.toLowerCase(), user.id]
      )
      .first()
      .catch(() => {});
    if (deleted) await this.requestFetch(`Deleted redirect with code ${code}`);
    return deleted;
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
      .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor("#2ECC71")
      .addFields([
        {
          name: language.get("REDIRECT_SHORT_URL"),
          value: `https://inv.wtf/${code}`,
        },
        { name: "URL", value: data.url },
        {
          name: language.get("CLICKS"),
          value: data.clicks.toLocaleString(language.id),
        },
        {
          name: language.get("LINKS"),
          value: data.links.toLocaleString(language.id),
        },
      ])
      .setTimestamp();
    return embed;
  }
}
