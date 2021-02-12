import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TagEdit extends Command {
  constructor() {
    super("tag-edit", {
      description: (language: Language) =>
        language.get("TAG_EDIT_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      userPermissions: ["MANAGE_MESSAGES"],
      args: [
        {
          id: "tag",
          type: "string",
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
      aliases: ["tags-edit", "dtag-edit", "dtags-edit"],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string; content?: string }) {
    if (!args.tag) return await message.error("TAGS_EDIT_MISSING_NAME");
    else if (!args.content)
      return await message.error("TAGS_EDIT_MISSING_CONTENT");
    const { tag, content } = args;
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    if (
      manager.cache.size > 20 &&
      manager.cache.keyArray().indexOf(cachedTag.name) > 20 &&
      !message.guild.premium
    )
      return await message.error("TAGS_EDIT_LIMIT");
    try {
      const edited = await manager.editTag(tag, content);
      if (typeof edited == "boolean" && !edited) return await message.error();
      return await message.success();
    } catch {
      return await message.error();
    }
  }
}
