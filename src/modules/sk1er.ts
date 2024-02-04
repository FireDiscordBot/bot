import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Module } from "@fire/lib/util/module";
import { CategoryChannel, Snowflake } from "discord.js";

const categories = {
  "🖥️": "958837673651478529",
  "🐛": "958837723534336000",
};

const subjects = {
  "🖥️": "General Support",
  "🐛": "Bug Report",
};

export default class Sk1er extends Module {
  guildId: Snowflake;
  guild: FireGuild;

  constructor() {
    super("sk1er");
    this.guildId = "411619823445999637";
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
  }

  async handleSupport(trigger: ComponentMessage, user: FireUser) {
    const member =
      trigger.member ??
      ((await this.guild.members.fetch(user).catch(() => {})) as FireMember);
    if (!member) return "no member"; // how
    let emoji: string;
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
    if (!emoji) return "no emoji";
    const category = this.guild.channels.cache.get(
      categories[emoji]
    ) as CategoryChannel;
    if (!category) return "no category";
    return await this.guild.createTicket(
      member,
      subjects[emoji],
      null,
      category
    );
  }
}
