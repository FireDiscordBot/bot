import { CategoryChannel, MessageReaction, Snowflake, Role } from "discord.js";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";

export default class Sk1er extends Module {
  essentialHeaders: { secret: string };
  descriptionUpdate: NodeJS.Timeout;
  supportMessage: FireMessage;
  supportMessageId: Snowflake;
  supportguildId: Snowflake;
  supportGuild: FireGuild;
  nitroId: Snowflake;
  guildId: Snowflake;
  guild: FireGuild;
  nitro: Role;

  constructor() {
    super("sk1er");
    this.guildId = "411619823445999637";
    this.supportguildId = "755794954743185438";
    this.supportMessageId = "755817441581596783";
    this.nitroId = "585534346551754755";
    this.descriptionUpdate = setInterval(
      async () => await this.descriptionUpdater(),
      300000
    );
  }

  async init() {
    if (this.client.config.dev) return this.remove();
    if (this.client.readyAt) await this.ready();
    else this.client.once("ready", () => this.ready());
  }

  async ready() {
    this.guild = this.client.guilds.cache.get(this.guildId) as FireGuild;
    this.supportGuild = this.client.guilds.cache.get(
      this.supportguildId
    ) as FireGuild;
    if ([!this.guild, !this.supportGuild].every((value) => value == true)) {
      this.remove();
      return;
    }
    this.nitro = this.guild?.roles.cache.get(this.nitroId);
    this.essentialHeaders = { secret: process.env.MODCORE_SECRET };
    if (this.guild) {
      await this.descriptionUpdater();
      await this.nitroChecker();
    }
  }

  async unload() {
    clearInterval(this.descriptionUpdate);
  }

  async descriptionUpdater() {
    try {
      const responses = await Promise.all([
        centra("https://api.sk1er.club/mods_analytics")
          .header("User-Agent", this.client.manager.ua)
          .send(),
        centra("https://api.autotip.pro/counts")
          .header("User-Agent", this.client.manager.ua)
          .send(),
        centra("https://api.hyperium.cc/users")
          .header("User-Agent", this.client.manager.ua)
          .send(),
      ]);
      const jsons = (await Promise.all(
        responses.map((response) => response.json())
      )) as [{ combined_total: number }, { total: number }, { all: number }];
      const count = jsons[0].combined_total + jsons[1].total + jsons[2].all;

      await this.guild.edit(
        {
          description: `The Official Discord for Sk1er & Sk1er Mods (${count.toLocaleString(
            this.guild.language.id
          )} total players)`,
        },
        "Description Updater Task (Now with less hacky code!)"
      );
    } catch {}
  }

  async nitroChecker() {
    let users: Snowflake[] = [];
    const essentialResult = await this.client.db.query(
      "SELECT uid FROM essential;"
    );
    for await (const row of essentialResult) {
      users.push(row.get("uid") as Snowflake);
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
            (
              this.guild.channels.cache.get(
                "411620457754787841"
              ) as FireTextChannel
            ).send({
              content: this.guild.language.get("SK1ER_NITRO_PERKS_REMOVED", {
                member: member.toMention(),
              }) as string,
              allowedMentions: { users: [member.id] },
            });
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
            (
              this.guild.channels.cache.get(
                "411620457754787841"
              ) as FireTextChannel
            ).send(
              this.guild.language.get("SK1ER_NITRO_PERKS_REMOVED_LEFT", {
                member: user.toString(),
              })
            );
        }
      });
    }
  }

  async handleSupport(
    trigger: MessageReaction | ComponentMessage,
    user: FireUser
  ) {
    const member =
      trigger instanceof ComponentMessage && trigger.member
        ? trigger.member
        : ((await this.supportGuild.members.fetch(user)) as FireMember);
    if (!member) return "no member"; // how
    let emoji: string;
    if (trigger instanceof MessageReaction) {
      emoji = trigger.emoji.name;
      try {
        await trigger.users.remove(user);
      } catch {}
    } else {
      if (!trigger.message) return "no message";
      const component = (trigger.message as FireMessage).components
        .map((component) =>
          component.type == "ACTION_ROW"
            ? component?.components ?? component
            : component
        )
        .flat()
        .find(
          (component) =>
            component.type == "BUTTON" &&
            component.style != "LINK" &&
            component.customId == trigger.customId
        );
      if (component.type != "BUTTON" || component.style == "LINK")
        return "non button";
      if (!component.emoji) return "unknown emoji";
      emoji =
        typeof component.emoji == "string"
          ? component.emoji
          : component.emoji.name;
    }
    if (!emoji) return "no emoji";
    if (emoji == "🖥️") {
      const category = this.supportGuild.channels.cache.get(
        "755795962462732288"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.supportGuild.createTicket(
        member,
        "General Support",
        null,
        category
      );
    }
    if (emoji == "💸") {
      const category = this.supportGuild.channels.cache.get(
        "755796036198596688"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.supportGuild.createTicket(
        member,
        "Purchase Support",
        null,
        category
      );
    }
    if (emoji == "🐛") {
      const category = this.supportGuild.channels.cache.get(
        "755795994855211018"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.supportGuild.createTicket(
        member,
        "Bug Report",
        null,
        category
      );
    }
  }

  async getUUID(user: FireMember | FireUser) {
    const rows = (
      await this.client.db.query("SELECT uuid FROM essential WHERE uid=$1;", [
        user.id,
      ])
    ).rows;

    return rows[0] ? rows[0][0]?.toString() : null;
  }

  async setUUID(user: FireMember | FireUser, uuid: string) {
    try {
      const current = await this.getUUID(user);
      if (current)
        await this.client.db.query(
          "UPDATE essential SET uuid=$1 WHERE uid=$2;",
          [uuid, user.id]
        );
      else
        await this.client.db.query(
          "INSERT INTO essential (uid, uuid) VALUES ($1, $2);",
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
      .header("User-Agent", this.client.manager.ua)
      .header("secret", this.essentialHeaders.secret)
      .send();

    if (nitroReq.statusCode == 200) {
      const result = await this.client.db.query(
        "DELETE FROM essential WHERE uid=$1;",
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
      .header("User-Agent", this.client.manager.ua)
      .header("secret", this.essentialHeaders.secret)
      .send();

    return nitroReq.statusCode == 200;
  }
}
