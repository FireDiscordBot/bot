import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Option } from "@fire/lib/interfaces/interactions";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

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
      aliases: ["tags-view", "dtag-view", "dtags-view"],
      restrictTo: "guild",
      slashOnly: true,
      parent: "tag",
    });
  }

  async autocomplete(guild: FireGuild, option: Option) {
    if (!guild.tags) {
      guild.tags = new GuildTagManager(this.client, guild);
      await guild.tags.init();
    }
    if (option.value)
      return guild.tags.getFuzzyMatches(option.value.toString());
    return guild.tags.names.slice(0, 20);
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
