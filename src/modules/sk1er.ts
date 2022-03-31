import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Module } from "@fire/lib/util/module";
import * as centra from "centra";
import { CategoryChannel, MessageReaction, Role, Snowflake } from "discord.js";

export default class Sk1er extends Module {
  descriptionUpdate: NodeJS.Timeout;
  nitroId: Snowflake;
  guildId: Snowflake;
  guild: FireGuild;
  nitro: Role;

  constructor() {
    super("sk1er");
    this.guildId = "411619823445999637";
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
    if (!this.guild) {
      this.remove();
      return;
    }
    this.nitro = this.guild?.roles.cache.get(this.nitroId);
    if (this.guild) await this.descriptionUpdater();
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
      ]);
      const jsons = (await Promise.all(
        responses.map((response) => response.json())
      )) as [{ combined_total: number }, { total: number }];
      const count = jsons[0].combined_total + jsons[1].total;

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

  async handleSupport(
    trigger: MessageReaction | ComponentMessage,
    user: FireUser
  ) {
    const member =
      trigger instanceof ComponentMessage && trigger.member
        ? trigger.member
        : ((await this.guild.members.fetch(user)) as FireMember);
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
      const category = this.guild.channels.cache.get(
        "958837673651478529"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "General Support",
        null,
        category
      );
    }
    if (emoji == "💸") {
      const category = this.guild.channels.cache.get(
        "958827935253545020"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "Purchase Support",
        null,
        category
      );
    }
    if (emoji == "🐛") {
      const category = this.guild.channels.cache.get(
        "958837723534336000"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "Bug Report",
        null,
        category
      );
    }
  }
}
