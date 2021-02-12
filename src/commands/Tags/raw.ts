import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const markdownRegex = /[_\\~|\*`]/gim;

export default class TagRaw extends Command {
  constructor() {
    super("tag-raw", {
      description: (language: Language) =>
        language.get("TAG_RAW_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
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
    const hasMarkdown = markdownRegex.test(cachedTag.content);
    markdownRegex.lastIndex = 0;
    if (hasMarkdown || cachedTag.content.length >= 2000)
      return await message.channel.send(
        await this.client.util.haste(cachedTag.content, false, "md")
      );
    else return await message.channel.send(cachedTag.content);
  }
}
