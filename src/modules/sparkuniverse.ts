import {
  MessageActionRow,
  CategoryChannel,
  MessageButton,
  Snowflake,
  Channel,
} from "discord.js";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Module } from "@fire/lib/util/module";

const supportMarketplaceBugMessage =
  "Please select the product you require support with below.";

const supportMarketplaceBugMessageTwo = `Make sure you have checked <#595100330757193747> before continuing.

If you still require support, hit the green button below or hit the red one to cancel.`;

const supportJavaBugMessage =
  "Please select the modpack you require support with below.";

const productNames = {
  furniture: "Furniture Series",
  dragons: "Dragons++",
  zombies: "Zombies",
  other: "Other",
};

const modpackNames = {
  insanecraft: "InsaneCraft",
};

const openButton = () =>
  new MessageButton()
    .setStyle("SUCCESS")
    .setLabel("Open a ticket")
    .setEmoji("🎟️");

const cancelButton = new MessageButton()
  .setLabel("Cancel")
  .setStyle("DANGER")
  .setCustomId("cancel_me");

export default class SparkUniverse extends Module {
  guildId: Snowflake = "864592657572560958";
  guild: FireGuild;

  categoryIds: Snowflake[] = ["585863245479542795", ""];
  categories: Record<Snowflake, CategoryChannel> = {};

  constructor() {
    super("sparkuniverse");
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
    for (const id of this.categoryIds) {
      const channel = this.client.channels.cache
        .filter((c) => c.type == "GUILD_CATEGORY")
        .get(id) as CategoryChannel;
      if (!channel) {
        this.categoryIds = this.categoryIds.filter((c) => c != id);
        continue;
      }
      this.categories[channel.guildId] = channel;
    }
  }

  async handleTicket(trigger: ComponentMessage, type: string) {
    const member = trigger.member
      ? trigger.member
      : ((await this.guild.members.fetch(trigger.author)) as FireMember);
    if (!member) return "no member"; // how
    if (!type) return "no type";
    if (type.startsWith("marketplace_bug_")) {
      const product = productNames[type.split("_")[2]];
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        `I found a bug with ${product} that needs to be squashed 🐛`,
        trigger.realChannel as FireTextChannel,
        category,
        `Please provide us with as much detail as possible about the bug you found.

We will also require the product name and the device you use to play.`
      );
    } else if (type == "marketplace_feedback") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I have feedback for you!",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "marketplace_general") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I have a general question for you! ❓",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type.startsWith("java_bug")) {
      let modpack: string;
      // const modpack = modpackNames[type.split("_")[2]];
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      const ticket = await trigger.guild.createTicket(
        member,
        modpack
          ? `I found a bug with ${modpack} that needs to be squashed 🐛`
          : "I found a bug that needs to be squashed 🐛",
        trigger.realChannel as FireTextChannel,
        category
      );
      if (ticket instanceof Channel) {
        if (!this.guild.tags) {
          this.guild.tags = new GuildTagManager(this.client, this.guild);
          await this.guild.tags.init();
        }
        const manager = this.guild.tags;
        const cachedTag = await manager.getTag("curseforgelog");
        if (!cachedTag) return ticket;
        await manager.useTag(cachedTag.name);
        await ticket.send({ content: cachedTag.content }).catch(() => {});
      }
      return ticket;
    } else if (type.startsWith("java_crash")) {
      let modpack: string;
      // const modpack = modpackNames[type.split("_")[2]];
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      const ticket = await trigger.guild.createTicket(
        member,
        modpack
          ? `${modpack} is crashing <:crashwoah:895747752443666442>`
          : "My game is crashing <:crashwoah:895747752443666442>",
        trigger.realChannel as FireTextChannel,
        category
      );
      if (ticket instanceof Channel) {
        if (!this.guild.tags) {
          this.guild.tags = new GuildTagManager(this.client, this.guild);
          await this.guild.tags.init();
        }
        const manager = this.guild.tags;
        const cachedTag = await manager.getTag("curseforgelog");
        if (!cachedTag) return ticket;
        await manager.useTag(cachedTag.name);
        await ticket.send({ content: cachedTag.content }).catch(() => {});
      }
      return ticket;
    } else if (type == "java_feedback") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I have feedback for you!",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "java_general") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I have a general question for you! ❓",
        trigger.realChannel as FireTextChannel,
        category
      );
    }
  }

  async supportHandleMarketplaceBug(button: ComponentMessage) {
    const actionsOne = [
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("Furniture Series")
        .setCustomId("sparksupport:marketplace_bug_furniture"),
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("Dragons++")
        .setCustomId("sparksupport:marketplace_bug_dragons"),
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("Zombies")
        .setCustomId("sparksupport:marketplace_bug_zombies"),
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("Other")
        .setCustomId("sparksupport:marketplace_bug_other"),
    ];
    const actionsTwo = [cancelButton]; // add cancel on another row to easily allow expansion
    return await button.edit({
      content: supportMarketplaceBugMessage,
      components: [
        new MessageActionRow().setComponents(actionsOne),
        new MessageActionRow().setComponents(actionsTwo),
      ],
    });
  }

  async supportHandleMarketplaceBugSecond(button: ComponentMessage) {
    const id = button.customId.split(":")[1];
    const actions = [
      openButton().setCustomId(`spark_confirm_${id}`),
      cancelButton,
    ];
    return await button.edit({
      content: supportMarketplaceBugMessageTwo,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleMarketplaceBugFurniture(button: ComponentMessage) {
    return await this.supportHandleMarketplaceBugSecond(button);
  }

  async supportHandleMarketplaceBugDragons(button: ComponentMessage) {
    return await this.supportHandleMarketplaceBugSecond(button);
  }

  async supportHandleMarketplaceBugZombies(button: ComponentMessage) {
    return await this.supportHandleMarketplaceBugSecond(button);
  }

  async supportHandleMarketplaceBugOther(button: ComponentMessage) {
    return await this.supportHandleMarketplaceBugSecond(button);
  }

  async supportHandleJavaBug(button: ComponentMessage) {
    throw new Error("you dun goofed"); // this shouldn't actually get called yet

    // this is for the future if there is ever more than one modpack

    // const actionsOne = [
    //   new MessageButton()
    //     .setStyle("PRIMARY")
    //     .setLabel("InsaneCraft")
    //     .setCustomId("sparksupport:java_bug_insanecraft"),
    // ];
    // const actionsTwo = [cancelButton]; // add cancel on another row to easily allow expansion
    // return await button.edit({
    //   content: supportJavaBugMessage,
    //   components: [
    //     new MessageActionRow().setComponents(actionsOne),
    //     new MessageActionRow().setComponents(actionsTwo),
    //   ],
    // });
  }
}
