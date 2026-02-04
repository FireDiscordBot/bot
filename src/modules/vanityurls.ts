import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
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
    const blacklistResult = await this.client.db.query<{ gid: Snowflake }>(
      "SELECT gid FROM vanitybl;"
    );
    for await (const blacklist of blacklistResult)
      this.blacklisted.push(blacklist.gid);
  }

  get vanityDomain() {
    return this.client.config.dev
      ? `${this.client.manager.REST_HOST}/inv.wtf`
      : "https://inv.wtf";
  }

  isBlacklisted(guild: FireGuild | Snowflake) {
    return this.blacklisted.includes(
      guild instanceof FireGuild ? guild.id : guild
    );
  }

  requestFetch(guild: Snowflake) {
    this.client.manager.ws?.send(
      MessageUtil.encode(
        new Message(EventType.VANITY_REFRESH, {
          guild,
        })
      )
    );
  }

  async getVanity(code: string) {
    const vanityReq = await centra(`${this.vanityDomain}/api/${code}`)
      .header("User-Agent", this.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
      .send();
    if (vanityReq.statusCode == 404) return false;
    // if we get an unexpected status code, we should return true
    // as that will indicate that the vanity is not valid for creation
    else if (vanityReq.statusCode != 200) throw new Error();
    const vanity = await vanityReq.json();
    // if there's no invite, it's not a valid vanity response
    // (possibly a redirect or something broke)
    if (!vanity.invite) throw new Error();
    return vanity as VanityURL;
  }

  async getVanityLimitRemaining(user: FireMember | FireUser, guild: FireGuild) {
    const totalLimit = user.settings.get<number>(
      "stripe.addons.extra_vanity",
      0
    );
    if (!totalLimit) {
      const current = await this.client.db
        .query<{
          code: string;
        }>("SELECT code FROM vanity WHERE gid=$1;", [guild.id])
        .first();
      if (current && current.code) return 0;
      else return 1; // each guild can have one vanity by default
    } else {
      const currentUser = await this.client.db.query<{
        gid: Snowflake;
        count: bigint;
      }>(
        "SELECT gid, count(code) FROM vanity WHERE uid=$1 AND redirect IS NULL GROUP BY gid;",
        [user.id]
      );
      let inUse = 0;
      for await (const row of currentUser) {
        const count = Number(row.count);
        if (!count) continue;
        // we subtract 1 because each guild can have one vanity by default
        inUse += count - 1;
      }

      return totalLimit - inUse;
    }
  }

  async create(
    guild: FireGuild,
    code: string,
    invite: Invite,
    createdBy: FireMember | FireUser
  ) {
    if (this.isBlacklisted(guild)) return "blacklisted";
    code = code.toLowerCase();
    const currentResult = await this.client.db
      .query<{
        code: string;
      }>("SELECT code FROM vanity WHERE gid=$1 AND code ILIKE $2;", [
        guild.id,
        code,
      ])
      .first();
    if (!currentResult) {
      const created = await this.client.db
        .query(
          "INSERT INTO vanity (gid, code, invite, uid) VALUES ($1, $2, $3, $4) RETURNING *;",
          [guild.id, code, invite.code, createdBy.id]
        )
        .first()
        .catch(() => {});
      if (created) this.requestFetch(guild.id);
      return created;
    } else {
      const updated = await this.client.db
        .query(
          "UPDATE vanity SET (code, invite, uid) = ($1, $2, $3) WHERE code=$4 RETURNING *;",
          [code, invite.code, createdBy.id, currentResult.code]
        )
        .first()
        .catch(() => {});
      if (updated) this.requestFetch(guild.id);
      return updated;
    }
  }

  async delete(source: FireGuild | string, alsoDeleteInvite = false) {
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
        .query("DELETE FROM vanity WHERE gid=$1 RETURNING *;", [source.id])
        .catch(() => {});
      if (deleted && deleted.status.startsWith("DELETE ")) {
        this.requestFetch(source.id);
        if (alsoDeleteInvite)
          for await (const vanity of deleted)
            await this.client
              .fetchInvite(vanity.get("invite") as string)
              // we only want to delete invites *we* created
              .then(
                (i) =>
                  i.inviterId == this.client.user.id &&
                  i.delete(
                    source.language.get("VANITY_DELETE_DELETING_INVITE_REASON")
                  )
              )
              .catch(() => {});
      }

      return deleted && deleted.status.startsWith("DELETE ");
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

        const remainingResult = await this.client.db
          .query<{
            count: bigint;
          }>("SELECT count(code) FROM vanity WHERE gid=$1;", [guildId])
          .first();
        const remaining = Number(remainingResult.count);

        // if there are no more vanities for this guild, we should remove it from discovery
        if (!remaining) {
          // might not be a guild on this cluster so we need to use
          // GuildSettings#retrieve instead of getting from cache
          const settings = await GuildSettings.retrieve(
            guildId,
            this.client
          ).catch(() => {});
          if (settings && settings.get<boolean>("utils.public", false)) {
            await settings.set<boolean>(
              "utils.public",
              false,
              this.client.user
            );
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
        }

        if (alsoDeleteInvite) {
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

      return deleted && deleted.get("gid");
    }
  }

  async current(guild: FireGuild, code: string, language?: Language) {
    if (!language) language = guild.language;
    const data = await this.getVanity(code).catch(() => {});
    if (!data) return null;
    else if (data.gid != guild.id)
      throw new Error("VANITY_VIEW_CODE_WRONG_GUILD");
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
      .addFields({ name: "URL", value: `${this.vanityDomain}/${code}` })
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
