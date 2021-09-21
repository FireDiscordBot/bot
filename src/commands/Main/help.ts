import {
  MessageEmbedOptions,
  BitFieldResolvable,
  MessageActionRow,
  PermissionString,
  MessageButton,
  GuildChannel,
  Permissions,
} from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { Option } from "@fire/lib/interfaces/interactions";
import { FireGuild } from "@fire/lib/extensions/guild";
import VanityURLs from "@fire/src/modules/vanityurls";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const userMentionRegex = /<@!?(\d{15,21})>$/im;

export default class Help extends Command {
  constructor() {
    super("help", {
      description: (language: Language) =>
        language.get("HELP_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      aliases: ["helpme", "commands", "h"],
      args: [
        {
          id: "command",
          type: "command",
          autocomplete: true,
          default: undefined,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async autocomplete(guild: FireGuild, option: Option) {
    if (option.value)
      return this.client.commandHandler.modules
        .filter(
          (cmd) =>
            cmd.id.includes(option.value.toString()) &&
            (cmd.requiresExperiment
              ? guild.hasExperiment(
                  cmd.requiresExperiment.id,
                  cmd.requiresExperiment.bucket
                )
              : true)
        )
        .map((cmd) => cmd.id.replace("-", " "))
        .slice(0, 20);
    return this.client.commandHandler.modules
      .filter((cmd) =>
        cmd.requiresExperiment
          ? guild.hasExperiment(
              cmd.requiresExperiment.id,
              cmd.requiresExperiment.bucket
            )
          : true
      )
      .map((cmd) => cmd.id.replace("-", " "))
      .slice(0, 20);
  }

  async exec(message: FireMessage, args: { command: Command }) {
    if (typeof args.command == "undefined") return await this.sendHelp(message);
    else if (!args.command) return await message.error("HELP_NO_COMMAND");
    else return await this.sendUsage(message, args.command);
  }

  async sendHelp(message: FireMessage) {
    let fields: { name: string; value: string; inline: boolean }[] = [];
    for (const [name, category] of this.client.commandHandler.categories) {
      if (name == "Admin" && !message.author.isSuperuser()) continue;
      let commands: string[] = [];
      category
        .filter((command) => {
          if (command.hidden && !message.author.isSuperuser()) return false;
          if (command.ownerOnly && this.client.ownerID != message.author.id)
            return false;
          if (command.superuserOnly && !message.author.isSuperuser())
            return false;
          if (
            command.moderatorOnly &&
            !message.member?.isModerator(message.channel)
          )
            return false;
          if (
            command.guilds.length &&
            !command.guilds.includes(message.guild?.id)
          )
            return false;
          if (command.channel == "guild" && !message.guild) return false;
          if (
            (command.userPermissions as PermissionString[])?.length &&
            !message.guild
          )
            return false;
          if (
            (command.userPermissions as PermissionString[])?.length &&
            (message.channel as GuildChannel)
              .permissionsFor(message.author)
              .missing(
                command.userPermissions as BitFieldResolvable<
                  PermissionString,
                  bigint
                >
              ).length
          )
            return false;
          return true;
        })
        .forEach((command) =>
          commands.push(
            command.parent
              ? `\`${command.id.replace("-", " ")}\``
              : `\`${command.id}\``
          )
        );
      if (commands.length)
        fields.push({
          name: category.id,
          value: commands.join(", "),
          inline: false,
        });
    }
    fields.push({
      name: message.language.get("HELP_CREDITS_NAME"),
      value:
        "\n" +
        message.language.get("HELP_CREDITS_VALUE", {
          links:
            "[Ravy](https://ravy.pink/) & [The Aero Team](https://aero.bot/)",
        }) +
        "\n[@aero/sanitizer](https://www.npmjs.com/package/@aero/sanitizer)\n[@aero/ksoft](https://www.npmjs.com/package/@aero/ksoft)\n[Aether](https://git.farfrom.earth/aero/aether)\n",
      inline: false,
    });
    let components: MessageActionRow[] = null;
    let supportInvite = "https://inv.wtf/fire";
    const vanityurls = this.client.getModule("vanityurls") as VanityURLs;
    if (vanityurls) {
      const supportVanity = await vanityurls.getVanity("fire");
      if (typeof supportVanity == "object" && supportVanity?.invite)
        supportInvite = `https://discord.gg/${supportVanity.invite}`;
    }
    components = [
      new MessageActionRow().addComponents([
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://fire.gaminggeek.dev/")
          .setLabel(message.language.get("HELP_BUTTON_WEBSITE")),
        new MessageButton()
          .setStyle("LINK")
          .setURL(supportInvite)
          .setLabel(message.language.get("HELP_BUTTON_SUPPORT")),
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://inv.wtf/terms")
          .setLabel(message.language.get("HELP_BUTTON_TOS")),
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://inv.wtf/privacy")
          .setLabel(message.language.get("HELP_BUTTON_PRIVACY")),
        new MessageButton()
          .setStyle("LINK")
          .setURL("https://inv.wtf/premium")
          .setLabel(message.language.get("HELP_BUTTON_PREMIUM")),
      ]),
    ];
    const embed = {
      color: message.member?.displayColor,
      author: {
        icon_url: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
      },
      fields,
      footer: {
        text: message.language.get("HELP_FOOTER", {
          prefix:
            message.util.parsed.prefix.replace(
              userMentionRegex,
              `@${this.client.user.username} `
            ) || "$",
          cluster: this.client.manager.id,
        }) as string,
      },
      timestamp: new Date(),
    } as MessageEmbedOptions;
    return await message.channel.send({
      components,
      embeds: [embed],
    });
  }

  async sendUsage(message: FireMessage, command: Command) {
    let permissions: string[] = [];
    for (const perm of (command.userPermissions || []) as Array<
      PermissionString | bigint
    >)
      permissions.push(this.client.util.cleanPermissionName(perm));
    let args: string[] = command.getArgumentsClean();
    const embed = {
      color: message.member?.displayColor,
      title: titleCase(command.id),
      description: command.description(message.language),
      fields: [
        {
          name: "» Usage",
          value: `${message.util.parsed.prefix || "$"}${command.id} ${
            args?.join(" ").replace(/\] \[/gim, " ") || ""
          }`,
          inline: false,
        },
      ],
      timestamp: new Date(),
    } as MessageEmbedOptions;
    if (permissions.length)
      embed.fields.push({
        name: "» Permission" + (permissions.length > 1 ? "s" : ""),
        value: permissions.join(", "),
        inline: false,
      });
    await message.channel.send({ embeds: [embed] });
  }
}
