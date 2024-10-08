import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { GuildTagManager, Tag } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  CommandInteractionOption,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";

export default class TagInfo extends Command {
  constructor() {
    super("tag-info", {
      description: (language: Language) =>
        language.get("TAG_INFO_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      args: [
        {
          id: "tag",
          type: "string",
          autocomplete: true,
          default: null,
          required: true,
        },
      ],
      aliases: ["tags-info", "dtag-info", "dtags-info"],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (!interaction.guild.tags) {
      interaction.guild.tags = new GuildTagManager(
        this.client,
        interaction.guild
      );
      await interaction.guild.tags.init();
    }
    if (focused.value)
      return interaction.guild.tags.getFuzzyMatches(focused.value?.toString());
    return interaction.guild.tags.names;
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    if (!args.tag) return await message.error("TAG_INFO_MISSING_ARG");
    const { tag } = args;
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, true, true);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", { tag });

    const embed = new MessageEmbed()
      .setAuthor({
        name: message.guild.name,
        iconURL: message.guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setDescription(
        cachedTag.content.length < 250
          ? cachedTag.content
          : cachedTag.content.slice(0, 249) + "..."
      )
      .setTimestamp()
      .addFields(
        [
          {
            name: message.language.get("TAG_NAME"),
            value: cachedTag.name,
          },
          cachedTag.aliases.length
            ? {
                name: message.language.get("TAG_ALIASES"),
                value: cachedTag.aliases.join(", "),
              }
            : null,
          cachedTag.createdBy
            ? {
                name: message.language.get("TAG_CREATOR"),
                value:
                  typeof cachedTag.createdBy == "string"
                    ? cachedTag.createdBy
                    : `${cachedTag.createdBy.toMention()} (${cachedTag.createdBy.toString()})`,
              }
            : null,
          cachedTag.uses
            ? {
                name: message.language.get("TAG_USES"),
                value: cachedTag.uses.toLocaleString(message.language.id),
              }
            : null,
        ].filter((field) => !!field)
      );

    return await message.channel.send({
      embeds: [embed],
      components: this.getInitialButtons(message, cachedTag),
    });
  }

  private getInitialButtons(message: FireMessage, tag: Tag) {
    return [
      new MessageActionRow().addComponents(
        [
          new MessageButton()
            .setLabel(message.language.get("TAG_INFO_EDIT_BUTTON"))
            .setCustomId(`!tag_edit:${tag.name}`)
            .setStyle("PRIMARY"),
          tag.content.length >= 100
            ? new MessageButton()
                .setLabel(message.language.get("TAG_INFO_VIEW_BUTTON"))
                .setCustomId(`tag_view:${tag.name}`)
                .setStyle("PRIMARY")
            : null,
          new MessageButton()
            .setLabel(message.language.get("TAG_INFO_DELETE_BUTTON"))
            .setCustomId(`!tag_delete:${tag.name}`)
            .setStyle("DANGER"),
        ].filter((component) => !!component)
      ),
    ];
  }
}
