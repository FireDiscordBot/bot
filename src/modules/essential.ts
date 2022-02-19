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

const supportCrashMessage = `Alright, you'll need to provide a log for us to diagnose the cause of the crash. You will be given instructions when the ticket is opened.
These instructions may not work if you're using a third-party launcher, you may need to consult a guide for that specific launcher.

Hit the green button below to continue or the red one to cancel.`;

const supportBugMessage = `Bugs can be nasty and require a good amount of information to squash. Below is a list of everything you should have ready to provide but don't worry if you can't get them all...

- Versions (Minecraft version, Operating System version and if you can find it, Essential version)
- Steps to Reproduce (What do you need to do for the bug to happen?)
- Latest Log

When you're ready, hit the green button below to continue or the red one to cancel.`;

const supportQuestionMessage = `We (probably) have the answer to your question but we'll need as much detail as you can give.

Firstly, you should check our [support page](<https://essential.gg/support>) to see if your question is answered there!

If our support page didn't answer your question, hit the green button below to continue or the red one to cancel.`;

const supportICEMessage = `Essential's Invite Friends feature is cool but it can't work in all situations.

If you're hosting the world, you'll need a decent PC and plenty of free RAM/CPU available for it to use. Checking these values while hosting and letting us know may help us help you.

Both players will also need a decent internet connection. If your connection isn't too stable, you may experience some issues such as falling into the void and timing out.
Lowering your render distance can sometimes help if you're timing out so give that a try!

If you're trying to play with a big modpack, it's important to note that some mods weren't designed to be used with Open to LAN (and therefore inviting friends with Esssential) so you may encounter isssues.

When you're ready, hit the green button below to continue or the red one to cancel.`;

const supportJavaMessage = `Essential's installer requires Java to be installed

If the installer is saying it could not find a valid Java installation, this can usually be fixed by following [this guide](https://essential.gg/support/troubleshooting/install-java) and restarting your PC.

If the guide helped, you can click the red button below to cancel opening a ticket. Otherwise, click the green one to speak to our support team.`;

const supportNetworkMessage = `Connection to Essential's network is required for most features to function!

The most common reason for not being able to connect is using or having previously used a cracked/pirated version of Minecraft or account "generator" software.

Please select the most appropriate option below to continue.`;

const supportNetworkPurchasedMessage = `There are a few other reasons that may prevent you from connecting...

- Internet issues, such as a bad connection or a firewall blocking essential.gg
- An outage on our end (Check <#885509698575560724> to see if there's any known issues)
- A malicious application has tampered with your system preventing you from authenticating with Mojang

Our support team will guide you through troubleshooting the issue in your ticket.

Click the green button below to open a ticket or the red one to cancel.`;

const supportOtherMessage = `No worries! We can't list every possible issue.

Make sure you have all the details about the issue ready to provide to the support team.
While we're usually quick to respond, issues outside of the ones listed may take a bit more time to get an answer...

When you're ready, hit the green button below to continue or the red one to cancel.`;

const openButton = () =>
  new MessageButton()
    .setStyle("SUCCESS")
    .setLabel("Open a ticket")
    .setEmoji("🎟️");

const cancelButton = new MessageButton()
  .setLabel("Cancel")
  .setStyle("DANGER")
  .setCustomId("cancel_me");

export default class Essential extends Module {
  otherGuildIds: Snowflake[] = ["874755593506803733"];
  publicGuildId: Snowflake = "864592657572560958";
  otherGuilds: FireGuild[] = [];
  publicGuild: FireGuild;

  categoryIds: Snowflake[] = ["880170184931934328", "930070260269318174"];
  categories: Record<Snowflake, CategoryChannel> = {};

  constructor() {
    super("essential");
  }

  async init() {
    if (this.client.config.dev) return this.remove();
    if (this.client.readyAt) await this.ready();
    else this.client.once("ready", () => this.ready());
  }

  async ready() {
    this.publicGuild = this.client.guilds.cache.get(
      this.publicGuildId
    ) as FireGuild;
    this.otherGuilds = this.otherGuildIds
      .map((id) => this.client.guilds.cache.get(id))
      .filter((guild) => !!guild) as FireGuild[];
    if (!this.publicGuild && !this.otherGuilds.length) {
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
      : ((await this.publicGuild.members.fetch(trigger.author)) as FireMember);
    if (!member) return "no member"; // how
    if (!type) return "no type";
    if (type == "general") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "General Support",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "crash") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      const ticket = await trigger.guild.createTicket(
        member,
        "My game is crashing <:crashwoah:895747752443666442>",
        trigger.realChannel as FireTextChannel,
        category
      );
      if (ticket instanceof Channel) {
        if (!this.publicGuild.tags) {
          this.publicGuild.tags = new GuildTagManager(
            this.client,
            this.publicGuild
          );
          await this.publicGuild.tags.init();
        }
        const manager = this.publicGuild.tags;
        const cachedTag = await manager.getTag("latestlog");
        if (!cachedTag) return ticket;
        await manager.useTag(cachedTag.name);
        await ticket.send({ content: cachedTag.content }).catch(() => {});
      }
      return ticket;
    } else if (type == "bug") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      const ticket = await trigger.guild.createTicket(
        member,
        "I found a bug that needs to be squashed 🐛",
        trigger.realChannel as FireTextChannel,
        category
      );
      if (ticket instanceof Channel)
        await ticket
          .send(
            `Here's a reminder of the information you'll need to send

- Versions (Minecraft version, Operating System version and if you can find it, Essential version)
- Steps to Reproduce (What do you need to do for the bug to happen?)
- Latest Log

You can run \`/latestlog\` for instructions on how to find your log.
These instructions are designed for the official launcher so if you're using a third-party launcher, you may need to consult a guide for that specific launcher.`
          )
          .catch(() => {});
      return ticket;
    } else if (type == "enquiry") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I have a question ❓",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "ice") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I need help or have encountered issues while inviting friends to a world 🧊",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "java") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "The Essential installer cannot find a valid Java installation ☕",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "network") {
      const category = this.categories[trigger.guildId];
      if (!category) return "no category";
      return await trigger.guild.createTicket(
        member,
        "I'm having issues connecting to the Essential network <:status_dnd:775514595951378452>",
        trigger.realChannel as FireTextChannel,
        category
      );
    }
  }

  async supportHandleCrash(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_crash"),
      cancelButton,
    ];
    return await button.edit({
      content: supportCrashMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleBug(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_bug"),
      cancelButton,
    ];
    return await button.edit({
      content: supportBugMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleEnquiry(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_enquiry"),
      cancelButton,
    ];
    return await button.edit({
      content: supportQuestionMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleIce(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_ice"),
      cancelButton,
    ];
    return await button.edit({
      content: supportICEMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleJava(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_java"),
      cancelButton,
    ];
    return await button.edit({
      content: supportJavaMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleNetwork(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("I have purchased the game")
        .setEmoji("💵")
        .setCustomId("essentialsupport:network_purchased"),
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("I am using a cracked/pirated version")
        .setEmoji("🏴‍☠️")
        .setCustomId("essentialsupport:cracked"),
      cancelButton,
    ];
    return await button.edit({
      content: supportNetworkMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleNetworkPurchased(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_network"),
      cancelButton,
    ];
    return await button.edit({
      content: supportNetworkPurchasedMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleCracked(button: ComponentMessage) {
    if (!button.guild.tags) {
      button.guild.tags = new GuildTagManager(this.client, button.guild);
      await button.guild.tags.init();
    }
    const manager = button.guild.tags;
    const cachedTag = await manager.getTag("cracked");
    return await button.edit({
      content: cachedTag.content,
      components: [new MessageActionRow().setComponents([cancelButton])],
    });
  }

  async supportHandleOther(button: ComponentMessage) {
    const actions = [
      openButton().setCustomId("essential_confirm_general"),
      cancelButton,
    ];
    return await button.edit({
      content: supportOtherMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }
}
