import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Option } from "@fire/lib/interfaces/interactions";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

const markdownRegex = /[_\\~|\*`]/gim;

export default class TagRaw extends Command {
  constructor() {
    super("tag-raw", {
      description: (language: Language) =>
        language.get("TAG_RAW_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
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

  async autocomplete(guild: FireGuild, option: Option) {
    if (!guild.tags) {
      guild.tags = new GuildTagManager(this.client, guild);
      await guild.tags.init();
    }
    if (option.value)
      return guild.tags.getFuzzyMatches(option.value.toString());
    return guild.tags.names.slice(0, 20);
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
    const hasMarkdown = markdownRegex.test(cachedTag.content);
    markdownRegex.lastIndex = 0;
    if (hasMarkdown || cachedTag.content.length >= 2000)
      return await message.channel.send({
        content: await this.client.util.haste(cachedTag.content, false, "md"),
      });
    else return await message.channel.send({ content: cachedTag.content });
  }
}
