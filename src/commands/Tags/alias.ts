import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { CommandInteractionOption } from "discord.js";

export default class TagAlias extends Command {
  constructor() {
    super("tag-alias", {
      description: (language: Language) =>
        language.get("TAG_ALIAS_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageMessages],
      args: [
        {
          id: "tag",
          type: "string",
          autocomplete: true,
          default: null,
          required: false,
        },
        {
          id: "alias",
          type: "string",
          required: false,
          match: "rest",
          default: null,
        },
      ],
      aliases: ["tags-alias", "dtag-alias", "dtags-alias"],
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

  async exec(message: FireMessage, args: { tag?: string; alias?: string }) {
    if (!args.tag) return await message.error("TAGS_ALIAS_MISSING_NAME");
    else if (!args.alias)
      return await message.error("TAGS_ALIAS_MISSING_ALIAS");
    const { tag, alias } = args;
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", { tag });
    if (
      manager.names.length > 20 &&
      manager.names.indexOf(cachedTag.name) > 20 &&
      !message.guild.premium
    )
      return await message.error("TAGS_EDIT_LIMIT");
    const aliased = await manager.addAlias(tag, alias);
    if (!aliased) return await message.error("TAGS_ALIAS_FAILED");
    else
      return await message.success("TAGS_ALIAS_ADDED", {
        tag: cachedTag.name,
        alias,
      });
  }
}
