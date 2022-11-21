import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { CommandInteractionOption, Permissions } from "discord.js";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TagDelete extends Command {
  constructor() {
    super("tag-delete", {
      description: (language: Language) =>
        language.get("TAG_DELETE_COMMAND_DESCRIPTION"),
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
      ],
      aliases: [
        "tag--",
        "tags-delete",
        "tags--",
        "dtag-delete",
        "dtag--",
        "dtags-delete",
        "dtags--",
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
    return interaction.guild.tags.names;
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    if (!args.tag) return await message.error("TAGS_DELETE_MISSING_ARG");
    const { tag } = args;
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false, true);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", { tag });
    if (cachedTag.createdBy && typeof cachedTag.createdBy != "string")
      cachedTag.createdBy = cachedTag.createdBy.id;
    delete cachedTag.uses;

    const data = await this.client.util
      .haste(JSON.stringify(cachedTag, null, 4), false, "json")
      .catch(() => {});
    if (!data) return await message.error("ERROR_CONTACT_SUPPORT");
    const deleted = await manager.deleteTag(tag).catch(() => false);
    if (typeof deleted == "boolean" && !deleted)
      return await message.error("TAG_DELETE_FAILED", { haste: data });
    else return await message.success("TAG_DELETE_SUCCESS", { haste: data });
  }
}
