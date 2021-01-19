import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class TagDelete extends Command {
  constructor() {
    super("tag-delete", {
      description: (language: Language) =>
        language.get("TAG_DELETE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      userPermissions: ["MANAGE_MESSAGES"],
      args: [
        {
          id: "tag",
          type: "string",
          default: null,
          required: true,
        },
      ],
      aliases: [
        "tag--",
        "tags-delete",
        "tags--",
        "dtag-delete",
        "dtag--",
        "dtags-delete",
        "dtags--",
      ],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    if (!args.tag) return await message.error("TAGS_DELETE_MISSING_ARG");
    const { tag } = args;
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    const deleted = await manager.deleteTag(tag).catch(() => false);
    if (typeof deleted == "boolean" && !deleted) return await message.error();
    else return await message.success();
  }
}
