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

Hit the thumbs up button below to continue or the thumbs down button to cancel.`;

const supportBugMessage = `Bugs can be nasty and require a good amount of information to squash. Below is a list of everything you should have ready to provide but don't worry if you can't get them all...

- Versions (Minecraft version, Operating System version and if you can find it, Essential version)
- Steps to Reproduce (What do you need to do for the bug to happen?)
- Latest Log

When you're ready, hit the thumbs up button below to continue or the thumbs down button to cancel.`;

const supportQuestionMessage = `We (probably) have the answer to your question but we'll need as much detail as you can give.

Firstly, you should check our [support page](<https://essential.gg/support>) to see if your question is answered there!

If our support page didn't answer your question, hit the thumbs up button below to continue or the thumbs down button to cancel.`;

const supportICEMessage = `Essential's Invite Friends feature is cool but it can't work in all situations.

If you're hosting the world, you'll need a decent PC and plenty of free RAM/CPU available for it to use. Checking these values while hosting and letting us know may help us help you.

Both players will also need a decent internet connection. If your connection isn't too stable, you may experience some issues such as falling into the void and timing out.
Lowering your render distance can sometimes help if you're timing out so give that a try!

If you're trying to play with a big modpack, it's important to note that some mods weren't designed to be used with Open to LAN (and therefore inviting friends with Esssential) so you may encounter isssues.

When you're ready, hit the thumbs up button below to continue or the thumbs down button to cancel.`;

const supportOtherMessage = `No worries! We can't list every possible issue.

Make sure you have all the details about the issue ready to provide to the support team.
While we're usually quick to respond, issues outside of the ones listed may take a bit more time to get an answer...

When you're ready, hit the thumbs up button below to continue or the thumbs down button to cancel.`;

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
    this.ticketChannel = this.guild?.channels.cache.get(
      this.ticketChannelId
    ) as FireTextChannel;
  }

  async handleTicket(trigger: ComponentMessage, type: string) {
    const member = trigger.member
      ? trigger.member
      : ((await this.guild.members.fetch(trigger.author)) as FireMember);
    if (!member) return "no member"; // how
    if (!type) return "no type";
    if (type == "general") {
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
    } else if (type == "crash") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      const ticket = await this.guild.createTicket(
        member,
        "My game is crashing <:crashwoah:895747752443666442>",
        this.ticketChannel,
        category
      );
      if (ticket instanceof Channel) {
        if (!this.guild.tags) {
          this.guild.tags = new GuildTagManager(this.client, this.guild);
          await this.guild.tags.init();
        }
        const manager = this.guild.tags;
        const cachedTag = await manager.getTag("latestlog");
        if (!cachedTag) return ticket;
        await manager.useTag(cachedTag.name);
        await ticket.send({ content: cachedTag.content }).catch(() => {});
      }
      return ticket;
    } else if (type == "bug") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      const ticket = await this.guild.createTicket(
        member,
        "I found a bug that needs to be squashed 🐛",
        this.ticketChannel,
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
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "I have a question ❓",
        this.ticketChannel,
        category
      );
    } else if (type == "ICE") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "I need help or have encountered issues while inviting friends to a world 🧊",
        this.ticketChannel,
        category
      );
    }
  }

  async supportHandleCrash(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("SECONDARY")
        .setEmoji("👍")
        .setCustomId("essential_confirm_crash"),
      new MessageButton()
        .setEmoji("👎")
        .setStyle("SECONDARY")
        .setCustomId("cancel_me"),
    ];
    return await button.edit({
      content: supportCrashMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleBug(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("SECONDARY")
        .setEmoji("👍")
        .setCustomId("essential_confirm_bug"),
      new MessageButton()
        .setEmoji("👎")
        .setStyle("SECONDARY")
        .setCustomId("cancel_me"),
    ];
    return await button.edit({
      content: supportBugMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleEnquiry(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("SECONDARY")
        .setEmoji("👍")
        .setCustomId("essential_confirm_enquiry"),
      new MessageButton()
        .setEmoji("👎")
        .setStyle("SECONDARY")
        .setCustomId("cancel_me"),
    ];
    return await button.edit({
      content: supportQuestionMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleICE(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("SECONDARY")
        .setEmoji("👍")
        .setCustomId("essential_confirm_ice"),
      new MessageButton()
        .setEmoji("👎")
        .setStyle("SECONDARY")
        .setCustomId("cancel_me"),
    ];
    return await button.edit({
      content: supportICEMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }

  async supportHandleOther(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("SECONDARY")
        .setEmoji("👍")
        .setCustomId("essential_confirm_general"),
      new MessageButton()
        .setEmoji("👎")
        .setStyle("SECONDARY")
        .setCustomId("cancel_me"),
    ];
    return await button.edit({
      content: supportOtherMessage,
      components: [new MessageActionRow().setComponents(actions)],
    });
  }
}
