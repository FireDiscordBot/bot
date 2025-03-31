import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { CommandInteractionOption } from "discord.js";
import Embed from "../Utilities/embed";

const embedRegex = /\{embed:(?<id>[A-Za-z0-9-]{21})\}/gim;

export default class TagView extends Command {
  embed: Embed;

  constructor() {
    super("tag-view", {
      description: (language: Language) =>
        language.get("TAG_VIEW_COMMAND_DESCRIPTION"),
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
    if (!this.embed) this.embed = this.client.getCommand("embed") as Embed;

    if (!command.guild.tags) {
      command.guild.tags = new GuildTagManager(this.client, command.guild);
      await command.guild.tags.init();
    }
    const manager = command.guild.tags;
    const cachedTag = await manager.getTag(args.tag);
    if (!cachedTag)
      return await command.error("TAG_INVALID_TAG", { tag: args.tag });
    await manager.useTag(cachedTag.name);

    const embeds = await manager.embedCommand.getEmbeds(cachedTag.embedIds);

    return await command.channel.send({
      content: cachedTag.content || "",
      embeds: embeds.map((embed) => embed.embed),
    });
  }
}
