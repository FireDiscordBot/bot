import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Util } from "discord.js";

export default class TagRaw extends Command {
  constructor() {
    super("tag-raw", {
      description: (language: Language) =>
        language.get("TAG_RAW_COMMAND_DESCRIPTION"),
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
      aliases: ["tags-raw", "dtag-raw", "dtags-raw"],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    if (!args.tag) return await message.error("TAGS_RAW_MISSING_ARG");
    const { tag } = args;
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    const content = Util.escapeMarkdown(cachedTag.content)
      .replace("<", "\\<\\")
      .replace(">", "\\>");
    return await message.channel.send(content);
  }
}
