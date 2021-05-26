import { FireMessage } from "@fire/lib/extensions/message";
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

  async exec(message: FireMessage, args: { tag?: string; alias?: string }) {
    if (!args.tag) return await message.error("TAGS_ALIAS_MISSING_NAME");
    else if (!args.alias)
      return await message.error("TAGS_ALIAS_MISSING_ALIAS");
    const { tag, alias } = args;
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    if (
      manager.cache.size > 20 &&
      manager.cache.keyArray().indexOf(cachedTag.name) > 20 &&
      !message.guild.premium
    )
      return await message.error("TAGS_EDIT_LIMIT");
    const aliased = await manager.addAlias(tag, alias);
    if (typeof aliased == "boolean" && !aliased) return await message.error();
    else return await message.success();
  }
}
