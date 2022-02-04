import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { CommandInteractionOption, Permissions } from "discord.js";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TagEdit extends Command {
  constructor() {
    super("tag-edit", {
      description: (language: Language) =>
        language.get("TAG_EDIT_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      args: [
        {
          id: "tag",
          type: "string",
          autocomplete: true,
          default: null,
          required: true,
        },
        {
          id: "content",
          type: "string",
          required: true,
          match: "rest",
          default: null,
        },
      ],
      aliases: [
        "tags-edit",
        "tags-~",
        "dtag-edit",
        "dtag-~",
        "dtags-edit",
        "dtags-~",
      ],
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
    return interaction.guild.tags.names.slice(0, 25);
  }

  async exec(message: FireMessage, args: { tag?: string; content?: string }) {
    if (!args.tag) return await message.error("TAGS_EDIT_MISSING_NAME");
    else if (!args.content)
      return await message.error("TAGS_EDIT_MISSING_CONTENT");
    const { tag, content } = args;
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
    try {
      const edited = await manager.editTag(tag, content);
      if (typeof edited == "boolean" && !edited) return await message.error("TAG_EDIT_FAILED");
      return await message.success("TAG_EDIT_SUCCESS");
    } catch {
      return await message.error("ERROR_CONTACT_SUPPORT");
    }
  }
}
