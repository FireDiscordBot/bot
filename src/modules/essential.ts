import {
  MessageActionRow,
  CategoryChannel,
  MessageButton,
  Snowflake,
} from "discord.js";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Module } from "@fire/lib/util/module";

const supportCrashMessage = `Alright, you'll need to provide a log for us to diagnose the cause of the crash. You can find instructions below on how to find the log.
If you're using a third party launcher, these instructions may not work and you'll have to consult a guide for that specific launcher.

**Windows:** Hit Windows Key + R and type in \`%appdata%\`. Open the \`.minecraft\` folder.
**Mac:** On the bar at the top of your screen in Finder, click \`Go\`, then click \`Go to Folder\` and type \`~/Library/Application Support/Minecraft\`, then hit enter.
**Linux:** \`.minecraft\` is located in your home folder. \`~/.minecraft\`

**If you used the Essential installer and chose to create a new profile, you'll need to open the \`essential_version\` folder (e.g. \`essential_1.17.1\`) in \`.minecraft\` before continuing**

Then proceed with navigating to the folder called \`logs\`. Inside that folder there is a file called \`latest\` or \`latest.log\`.

Once you have found this file, hit the green button below to continue or the red button to cancel.`;

const supportBugMessage = `Bugs can be nasty and require a good amount of information to squash. Below is a list of everything you should have ready to provide but don't worry if you can't get them all...

- Versions (Minecraft version, Operating System version and if you can find it, Essential version)
- Steps to Reproduce (What do you need to do for the bug to happen?)
- Latest Log

When you're ready, hit the green button below to continue or the red button to cancel.`;

const supportQuestionMessage = `We (probably) have the answer to your question but we'll need as much detail as you can give.

Firstly, you should check our [support page](<https://essential.gg/support>) to see if your question is answered there!

If our support page didn't answer your question, hit the green button below to continue or the red button to cancel.`;

const supportOtherMessage = `No worries! We can't list every possible issue.

Make sure you have all the details about the issue ready to provide to the support team.
While we're usually quick to respond, issues outside of the ones listed may take a bit more time to get an answer...

When you're ready, hit the green button below to continue or the red button to cancel.`;

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
    } else if (type == "purchase") {
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
    } else if (type == "bug") {
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
    } else if (type == "nufcrash") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "My game is crashing <:crashwoah:895747752443666442>",
        this.ticketChannel,
        category
      );
    } else if (type == "nufbug") {
      const category = this.guild.channels.cache.get(
        "880170184931934328"
      ) as CategoryChannel;
      if (!category) return "no category";
      return await this.guild.createTicket(
        member,
        "I found a bug that needs to be squashed 🐛",
        this.ticketChannel,
        category
      );
    } else if (type == "nufenquiry") {
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
    }
  }

  async supportHandleCrash(button: ComponentMessage) {
    const actions = [
      new MessageButton()
        .setStyle("SECONDARY")
        .setEmoji("👍")
        .setCustomId("essential_confirm_nufcrash"),
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
        .setCustomId("essential_confirm_nufbug"),
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
        .setCustomId("essential_confirm_nufenquiry"),
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
