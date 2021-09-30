import {
  MessageEmbedOptions,
  BitFieldResolvable,
  MessageSelectMenu,
  MessageActionRow,
  PermissionString,
  MessageButton,
  GuildChannel,
  MessageEmbed,
  Permissions,
} from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import VanityURLs from "@fire/src/modules/vanityurls";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const userMentionRegex = /<@!?(\d{15,21})>$/im;

const shouldShowUpsell = async (message: FireMessage) => {
  if (!message.hasExperiment(3144709624, 1)) return false;
  else if (!(message instanceof FireMessage)) return false;
  const slashCommands = await message.client
    .requestSlashCommands(message.guild)
    .catch(() => {});
  if (typeof slashCommands == "undefined") return false;
  const hasSlash =
    slashCommands &&
    !!slashCommands.applications.find(
      (app) => app.id == message.client.user.id
    );
  if (message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
    if (hasSlash) return "switch";
    else return "invite";
  else if (hasSlash) return "switch";
  else return "noslash";
};

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
          default: undefined,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  private filter(command: Command, message: FireMessage) {
    if (!(command instanceof Command)) return false;
    else if (command.hidden && !message.author.isSuperuser()) return false;
    else if (command.ownerOnly && this.client.ownerID != message.author.id)
      return false;
    else if (command.superuserOnly && !message.author.isSuperuser())
      return false;
    else if (
      command.moderatorOnly &&
      !message.member?.isModerator(message.channel)
    )
      return false;
    else if (
      command.guilds.length &&
      !command.guilds.includes(message.guild?.id)
    )
      return false;
    else if (command.channel == "guild" && !message.guild) return false;
    else if (
      (command.userPermissions as PermissionString[])?.length &&
      !message.guild
    )
      return false;
    else if (
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
  }

  async exec(message: FireMessage, args: { command: Command }) {
    if (typeof args.command == "undefined") return await this.sendHelp(message);
    else if (!args.command) return await message.error("HELP_NO_COMMAND");
    else return await this.sendUsage(message, args.command);
  }

  async sendHelp(message: FireMessage) {
    const categories = this.client.commandHandler.categories.filter(
      (category) => {
        if (category.id == "Admin" && !message.author.isSuperuser())
          return false;
        const commands = category.filter((command: Command) =>
          this.filter(command, message)
        );
        return commands.size > 0;
      }
    );
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
        new MessageSelectMenu()
          .setPlaceholder(message.language.get("HELP_SELECT_CATEGORY"))
          .setCustomId(`help_category`)
          .setMaxValues(1)
          .setMinValues(1)
          .addOptions(
            categories.map((category) => ({
              label: category.id,
              value: category.id,
            }))
          ),
      ]),
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
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .addField(
        message.language.get("HELP_CREDITS_NAME"),
        message.language.get("HELP_CREDITS_VALUE", {
          links:
            "[Ravy](https://ravy.pink/) & [The Aero Team](https://aero.bot/)",
        }) +
          "\n[@aero/sanitizer](https://www.npmjs.com/package/@aero/sanitizer)\n[@aero/ksoft](https://www.npmjs.com/package/@aero/ksoft)\n[Aether](https://git.farfrom.earth/aero/aether)\n"
      )
      .setFooter(
        message.language.get("HELP_FOOTER", {
          shard: message.guild?.shardId ?? 0,
          cluster: this.client.manager.id,
        })
      )
      .setTimestamp();
    const upsellType = await shouldShowUpsell(message);
    let upsellEmbed: MessageEmbed;
    if (upsellType == "invite")
      upsellEmbed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setAuthor(
          message.language.get("NOTICE_TITLE"),
          this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          })
        )
        .setDescription(
          message.language.get("COMMAND_NOTICE_SLASH_UPSELL", {
            invite: this.client.config.commandsInvite(
              this.client,
              message.guild.id
            ),
          })
        );
    else if (upsellType == "noslash")
      upsellEmbed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setAuthor(
          message.language.get("NOTICE_TITLE"),
          this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          })
        )
        .setDescription(
          message.language.get("COMMAND_NOTICE_SLASH_POKE", {
            invite: this.client.config.commandsInvite(
              this.client,
              message.guild.id
            ),
          })
        );
    else if (upsellType == "switch")
      upsellEmbed = new MessageEmbed()
        .setColor(message.member?.displayColor ?? "#FFFFFF")
        .setAuthor(
          message.language.get("NOTICE_TITLE"),
          this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          })
        )
        .setDescription(
          message.language.get("COMMAND_NOTICE_SLASH_SWITCH", {
            invite: this.client.config.commandsInvite(
              this.client,
              message.guild.id
            ),
          })
        );
    return await message.channel.send({
      components,
      embeds: [embed, upsellEmbed],
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
