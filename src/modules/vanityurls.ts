import { FireGuild } from "@fire/lib/extensions/guild";
import { VanityURL } from "@fire/lib/interfaces/invwtf";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { Language } from "@fire/lib/util/language";
import { Module } from "@fire/lib/util/module";
import { GuildSettings } from "@fire/lib/util/settings";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";
import { Invite, MessageEmbed } from "discord.js";

export default class VanityURLs extends Module {
  blacklisted: string[];

  constructor() {
    super("vanityurls");
    this.blacklisted = [];
  }

  async init() {
    this.blacklisted = [];
    const blacklistResult = await this.client.db.query(
      "SELECT * FROM vanitybl;"
    );
    for await (const blacklist of blacklistResult)
      this.blacklisted.push(blacklist.get("gid") as string);
  }

  requestFetch(guild: Snowflake) {
    this.client.manager.ws?.send(
      new Message(EventType.VANITY_REFRESH, {
        guild,
      })
    );
  }

  async getVanity(code: string) {
    const vanityReq = await centra(
      this.client.config.dev
        ? `${this.client.manager.REST_HOST}/inv.wtf/api/${code}`
        : `https://inv.wtf/api/${code}`
    )
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
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
    if (!currentResult) {
      const created = await this.client.db
        .query(
          "INSERT INTO vanity (gid, code, invite) VALUES ($1, $2, $3) RETURNING *;",
          [guild.id, code, invite.code]
        )
        .first()
        .catch(() => {});
      if (created) this.requestFetch(guild.id);
      return created;
    } else {
      const updated = await this.client.db
        .query(
          "UPDATE vanity SET (code, invite) = ($1, $2) WHERE code=$3 RETURNING *;",
          [code, invite.code, currentResult.get("code") as string]
        )
        .first()
        .catch(() => {});
      if (updated) this.requestFetch(guild.id);
      return updated;
    }
  }

  async delete(source: FireGuild | string) {
    if (source instanceof FireGuild) {
      // You can't have public set to true without a vanity
      // (though that does not necessarily mean you need a vanity to be public)
      await source.settings.set<boolean>(
        "utils.public",
        false,
        this.client.user
      );
      // We will however always remove the guild from discovery
      if (this.client.manager.ws?.open)
        this.client.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.DISCOVERY_UPDATE, {
              op: DiscoveryUpdateOp.REMOVE,
              guilds: [{ id: source.id }],
            })
          )
        );

      // and now we actually delete the guild's vanities
      const deleted = await this.client.db
        .query("DELETE FROM vanity WHERE gid=$1 RETURNING *;")
        .catch(() => {});
      if (deleted && deleted.status.startsWith("DELETE ")) {
        this.requestFetch(source.id);
        for await (const vanity of deleted)
          await this.client
            .fetchInvite(vanity.get("invite") as string)
            // we only want to delete invites *we* created
            .then((i) => i.inviterId == this.client.user.id && i.delete())
            .catch(() => {});
      }
    } else {
      // If we have a code, we delete first and ask questions later
      const deleted = await this.client.db
        .query(
          "DELETE FROM vanity WHERE (code ILIKE $1 OR invite ILIKE $1) AND gid IS NOT NULL RETURNING *;",
          [source]
        )
        .first()
        .catch(() => {});
      if (deleted && deleted.get("gid")) {
        const guildId = deleted.get("gid") as Snowflake;
        this.requestFetch(guildId);

        // might not be a guild on this cluster so we need to use
        // GuildSettings#retrieve instead of getting from cache
        const settings = await GuildSettings.retrieve(
          guildId,
          this.client
        ).catch(() => {});
        if (settings && settings.get<boolean>("utils.public")) {
          await settings.set<boolean>("utils.public", false, this.client.user);
          if (this.client.manager.ws?.open)
            this.client.manager.ws?.send(
              MessageUtil.encode(
                new Message(EventType.DISCOVERY_UPDATE, {
                  op: DiscoveryUpdateOp.REMOVE,
                  guilds: [{ id: guildId }],
                })
              )
            );
        }

        // this should always be true but just in case
        if (deleted.get("invite")) {
          const invite = await this.client
            .fetchInvite(deleted.get("invite") as string)
            .catch(() => {});
          if (invite && invite.inviterId == this.client.user.id)
            await invite.delete().catch(() => {});
        }
      }
    }
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
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .setColor("#2ECC71")
      .addFields({ name: "URL", value: `https://inv.wtf/${code}` })
      .setTimestamp();
    if (guild.premium) {
      embed.addFields([
        {
          name: language.get("CLICKS"),
          value: data.clicks.toLocaleString(language.id),
        },
        {
          name: language.get("LINKS"),
          value: data.links.toLocaleString(language.id),
        },
      ]);
    }
    if (splash) embed.setImage(splash);
    return embed;
  }
}
