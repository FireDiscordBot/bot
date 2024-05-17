import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { CommandInteractionOption } from "discord.js";

export default class TagRaw extends Command {
  constructor() {
    super("tag-raw", {
      description: (language: Language) =>
        language.get("TAG_RAW_COMMAND_DESCRIPTION"),
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
      aliases: ["tags-raw", "dtag-raw", "dtags-raw"],
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
    if (!args.tag) return await message.error("TAGS_RAW_MISSING_ARG");
    const { tag } = args;
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", { tag });
    return await message.channel.send({
      content: await this.client.util.haste(cachedTag.content, false, "md"),
    });
  }
}
