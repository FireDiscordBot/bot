import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { ArgumentTypeCaster } from "discord-akairo";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { GuildEmoji } from "discord.js";

const unicodeEmojiRegex = constants.regexes.unicodeEmoji;
const discordEmojiRegex = constants.regexes.customEmoji;
const defaultEmoji = "⭐";

export default class StarboardEmoji extends Command {
  converter: ArgumentTypeCaster;

  constructor() {
    super("starboard-emoji", {
      description: (language: Language) =>
        language.get("STARBOARD_EMOJI_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "emoji",
          type: "string",
          required: false,
          default: null,
        },
      ],
      restrictTo: "guild",
      parent: "starboard",
      premium: true,
    });
  }

  async exec(message: FireMessage, args: { emoji?: string }) {
    if (!this.converter)
      this.converter = this.client.commandHandler.resolver.types.get("emoji");
    let emoji: GuildEmoji | string = defaultEmoji;
    if (discordEmojiRegex.test(args.emoji)) {
      discordEmojiRegex.lastIndex = 0;
      emoji = this.converter(message, args.emoji);
    } else if (unicodeEmojiRegex.test(args.emoji)) emoji = args.emoji.trim();

    if (!emoji) return await message.error("STARBOARD_EMOJI_INVALID");

    if (emoji == defaultEmoji) message.guild.settings.delete("starboard.emoji");
    else
      message.guild.settings.set(
        "starboard.emoji",
        emoji instanceof GuildEmoji ? emoji.id : emoji
      );
    return await message.success("STARBOARD_EMOJI_SET", emoji.toString());
  }
}
