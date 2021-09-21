import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Option } from "@fire/lib/interfaces/interactions";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class TagAlias extends Command {
  constructor() {
    super("tag-alias", {
      description: (language: Language) =>
        language.get("TAG_ALIAS_COMMAND_DESCRIPTION"),
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

  async autocomplete(guild: FireGuild, option: Option) {
    if (!guild.tags) {
      guild.tags = new GuildTagManager(this.client, guild);
      await guild.tags.init();
    }
    if (option.value)
      return guild.tags.getFuzzyMatches(option.value.toString());
    return guild.tags.names.slice(0, 20);
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
    if (!aliased) return await message.error();
    else return await message.success();
  }
}
