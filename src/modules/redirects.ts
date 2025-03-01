import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Redirect } from "@fire/lib/interfaces/invwtf";
import { Language } from "@fire/lib/util/language";
import { Module } from "@fire/lib/util/module";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import * as centra from "centra";
import { MessageEmbed } from "discord.js";

export default class Redirects extends Module {
  constructor() {
    super("redirects");
  }

  get redirectDomain() {
    return this.client.config.dev
      ? `${this.client.manager.REST_HOST}/inv.wtf`
      : "https://inv.wtf";
  }

  requestFetch(redirect: string) {
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.VANITY_REFRESH, {
          redirect,
        })
      )
    );
  }

  async getRedirect(code: string) {
    const redirectReq = await centra(`${this.redirectDomain}/api/${code}`)
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
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
    if (!user.premium) return "PREMIUM";
    const limit = 5 * user.premium;
    code = code.toLowerCase();
    const current = await this.list(user);
    if (current.length >= limit && !user.isSuperuser()) return "LIMIT";
    const exists = await this.getRedirect(code);
    if (
      (typeof exists == "boolean" && exists) ||
      (typeof exists != "boolean" && exists.uid != user.id)
    )
      return "EXISTS";
    if (!exists) {
      const created = await this.client.db
        .query(
          "INSERT INTO vanity (uid, code, redirect) VALUES ($1, $2, $3) RETURNING *;",
          [user.id, code, url]
        )
        .first()
        .catch(() => {});
      if (created) this.requestFetch(code);
      return created;
    } else {
      const updated = await this.client.db
        .query(
          "UPDATE vanity SET (code, redirect) = ($1, $2) WHERE code=$1 AND uid=$3 RETURNING *;",
          [code, url, user.id]
        )
        .first()
        .catch(() => {});
      if (updated) this.requestFetch(code);
      return updated;
    }
  }

  async delete(code: string, user: FireMember | FireUser) {
    const deleted = await this.client.db
      .query("DELETE FROM vanity WHERE code ILIKE $1 AND uid=$2 RETURNING *;", [
        code,
        user.id,
      ])
      .first()
      .catch(() => {});
    if (deleted) this.requestFetch(code);
    return deleted;
  }

  async current(user: FireUser, code: string, language?: Language) {
    if (!language) language = user.language;
    const data = await this.getRedirect(code);
    if (typeof data == "boolean") return null;
    else if (data.uid != user.id)
      throw new Error("REDIRECT_VIEW_CODE_NOT_YOURS");
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
          value: `${this.redirectDomain}/${code}`,
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
