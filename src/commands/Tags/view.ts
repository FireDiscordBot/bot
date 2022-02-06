import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { CommandInteractionOption, Permissions } from "discord.js";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TagView extends Command {
  constructor() {
    super("tag-view", {
      description: (language: Language) =>
        language.get("TAG_VIEW_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "tag",
          type: "string",
          autocomplete: true,
          required: true,
          default: null,
        },
      ],
      restrictTo: "guild",
      slashOnly: true,
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

  async run(command: ApplicationCommandMessage, args: { tag: string }) {
    if (!command.guild.tags) {
      command.guild.tags = new GuildTagManager(this.client, command.guild);
      await command.guild.tags.init();
    }
    const manager = command.guild.tags;
    const cachedTag = await manager.getTag(args.tag);
    if (!cachedTag)
      return await command.error("TAG_INVALID_TAG", { tag: args.tag });
    await manager.useTag(cachedTag.name);
    return await command.channel.send({ content: cachedTag.content });
  }
}
