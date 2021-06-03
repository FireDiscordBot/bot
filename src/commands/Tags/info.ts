import {
  ActionRow,
  APIComponent,
  ButtonStyle,
  ButtonType,
} from "@fire/lib/interfaces/interactions";
import { ButtonMessage } from "@fire/lib/extensions/buttonMessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Tag } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";

export default class TagInfo extends Command {
  constructor() {
    super("tag-info", {
      description: (language: Language) =>
        language.get("TAG_INFO_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "tag",
          type: "string",
          default: null,
          required: true,
        },
      ],
      aliases: ["tags-info", "dtag-info", "dtags-info"],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    if (!args.tag) return await message.error("TAG_INFO_MISSING_ARG");
    const { tag } = args;
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);

    const embed = new MessageEmbed()
      .setAuthor(
        message.guild.name,
        message.guild.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setDescription(
        cachedTag.content.length < 100
          ? cachedTag.content
          : cachedTag.content.slice(0, 99) + "..."
      )
      .setTimestamp()
      .addField(message.language.get("TAG_NAME"), cachedTag.name);
    if (cachedTag.aliases.length)
      embed.addField(
        message.language.get("TAG_ALIASES"),
        cachedTag.aliases.join(", ")
      );
    if (cachedTag.createdBy)
      embed.addField(
        message.language.get("TAG_CREATOR"),
        typeof cachedTag.createdBy == "string"
          ? cachedTag.createdBy
          : `${cachedTag.createdBy.toMention()} (${cachedTag.createdBy.toString()})`
      );
    if (cachedTag.uses)
      embed.addField(
        message.language.get("TAG_USES"),
        cachedTag.uses.toLocaleString(message.language.id)
      );

    if (message.guild.hasExperiment(1621199146, 1))
      return message instanceof SlashCommandMessage
        ? await message.channel.send(null, {
            embed,
            buttons: this.getInitialButtons(message, cachedTag),
          })
        : await ButtonMessage.sendWithButtons(message.channel, embed, {
            buttons: this.getInitialButtons(message, cachedTag),
          });
    else return await message.channel.send(embed);
  }

  private getInitialButtons(message: FireMessage, tag: Tag) {
    return [
      {
        label: message.language.get("TAG_INFO_EDIT_BUTTON"),
        custom_id: `!tag_edit:${tag.name}`,
        style: ButtonStyle.PRIMARY,
        type: ButtonType.BUTTON,
      },
      tag.content.length >= 100
        ? {
            label: message.language.get("TAG_INFO_VIEW_BUTTON"),
            custom_id: `tag_view:${tag.name}`,
            style: ButtonStyle.PRIMARY,
            type: ButtonType.BUTTON,
          }
        : null,
      {
        label: message.language.get("TAG_INFO_DELETE_BUTTON"),
        custom_id: `!tag_delete:${tag.name}`,
        style: ButtonStyle.DESTRUCTIVE,
        type: ButtonType.BUTTON,
      },
    ].filter((component) => !!component) as APIComponent[];
  }
}
