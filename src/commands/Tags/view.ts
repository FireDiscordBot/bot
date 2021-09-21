import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
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

  async exec(message: FireMessage, args: { tag: string }) {
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(args.tag);
    if (!cachedTag)
      return await message.error("TAG_INVALID_TAG", { tag: args.tag });
    await manager.useTag(cachedTag.name);
    return await message.channel.send({ content: cachedTag.content });
  }
}
