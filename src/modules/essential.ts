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

When you're ready, hit the green button below to continue or the red pne to cancel.`;

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

If the installer is saying it could not find a valid Java installation, this can usually be fixed by following [this guide](https://essential.gg/support/the-basics/install-java) and restarting your PC.

If the guide helped, you can click the red button below to cancel opening a ticket. Otherwise, click the green one to speak to our support team.`;

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
  .setCustomId("essential_support_general"); // return to initial menu

export default class Essential extends Module {
  guildId: Snowflake;
  guild: FireGuild;

  constructor() {
    super("essential");
    this.guildId = "864592657572560958";
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
        trigger.realChannel as FireTextChannel,
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
        trigger.realChannel as FireTextChannel,
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
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "I have a question ❓",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "ice") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "I need help or have encountered issues while inviting friends to a world 🧊",
        trigger.realChannel as FireTextChannel,
        category
      );
    } else if (type == "java") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "The Essential installer cannot find a valid Java installation ☕",
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
