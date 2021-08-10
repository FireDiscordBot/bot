import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class TagDelete extends Command {
  constructor() {
    super("tag-delete", {
      description: (language: Language) =>
        language.get("TAG_DELETE_COMMAND_DESCRIPTION"),
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
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", { tag });
    const deleted = await manager.deleteTag(tag).catch(() => false);
    if (typeof deleted == "boolean" && !deleted) return await message.error();
    else return await message.success();
  }
}
