import { CategoryChannel, MessageReaction, Snowflake } from "discord.js";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Module } from "@fire/lib/util/module";

export default class Essential extends Module {
  ticketChannel: FireTextChannel;
  ticketChannelId: Snowflake;
  guildId: Snowflake;
  guild: FireGuild;

  constructor() {
    super("essential");
    this.guildId = "864592657572560958";
    this.ticketChannelId = "880141313981431829";
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
    this.ticketChannel = this.guild.channels.cache.get(
      this.ticketChannelId
    ) as FireTextChannel;
  }

  async handleTicket(trigger: ComponentMessage, user: FireUser) {
    const member = trigger.member
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
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "General Support",
        this.ticketChannel,
        category
      );
    }
    if (emoji == "💸") {
      const category = this.guild.channels.cache.get(
        "880170235397828650"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "Purchase Support",
        this.ticketChannel,
        category
      );
    }
    if (emoji == "🐛") {
      const category = this.guild.channels.cache.get(
        "880170285259686018"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "Bug Report",
        this.ticketChannel,
        category
      );
    }
  }
}
