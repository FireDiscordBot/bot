import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Steal extends Command {
  constructor() {
    super("steal", {
      description: (language: Language) =>
        language.get("STEAL_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_EMOJIS"],
      userPermissions: ["MANAGE_EMOJIS"],
      args: [
        {
          id: "emoji",
          type: "string",
          readableType: "emoji/emoji id/emoji url",
          slashCommandType: "emoji",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { emoji: string }) {
    let emoji = args.emoji;
    let name = "stolen_emoji";
    const emojiRegex = /<a?:(?<name>[a-zA-Z0-9\_]+):(?<id>\d{15,21})>/im;
    if (!emoji) return await message.error("STEAL_NOTHING");
    if (/^(\d{15,21})$/im.test(emoji.toString()))
      emoji = `https://cdn.discordapp.com/emojis/${emoji}.png?v=1`;
    else if (emojiRegex.test(emoji)) {
      const match = emojiRegex.exec(emoji);
      emoji = `https://cdn.discordapp.com/emojis/${match.groups.id}.png?v=1`;
      name = match.groups.name;
    } else if (
      !/^https?:\/\/cdn\.discordapp\.com(\/emojis\/\d{15,21})\.\w{3,4}/im.test(
        emoji
      )
    )
      return await message.error("STEAL_INVALID_EMOJI");
    let created;
    try {
      created = await message.guild.emojis.create(emoji, name);
    } catch {
      return await message.error("STEAL_CAUGHT");
    }
    return await message.success("STEAL_STOLEN", created.toString());
  }
}
