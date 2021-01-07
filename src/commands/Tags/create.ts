import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class TagCreate extends Command {
  constructor() {
    super("tag-create", {
      description: (language: Language) =>
        language.get("TAG_CREATE_COMMAND_DESCRIPTION"),
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
      aliases: [
        "tag-add",
        "tag-+",
        "tags-create",
        "tags-add",
        "tags-+",
        "dtag-create",
        "dtag-add",
        "dtag-+",
        "dtags-create",
        "dtags-add",
        "dtags-+",
      ],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string; content?: string }) {
    if (!args.tag) return await message.error("TAGS_CREATE_MISSING_NAME");
    else if (!args.content)
      return await message.error("TAGS_CREATE_MISSING_CONTENT");
    const { tag, content } = args;
    if (this.client.getCommand(`tag-${tag}`)?.parent == "tag")
      return await message.error("TAGS_CREATE_COMMAND_NAME");
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (cachedTag) return await message.error("TAGS_CREATE_ALREADY_EXISTS");
    if (manager.cache.size >= 20 && !message.guild.premium)
      return await message.error("TAGS_CREATE_LIMIT");
    const newTag = await manager.createTag(tag, content, message.member);
    if (typeof newTag == "boolean" && !newTag) return await message.error();
    else return await message.success();
  }
}
