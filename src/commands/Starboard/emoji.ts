import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { GuildEmoji } from "discord.js";

const unicodeEmojiRegex = constants.regexes.unicodeEmoji;
const discordEmojiRegex = constants.regexes.customEmoji;
const defaultEmoji = "⭐";

type ArgumentTypeCaster = (
  message: ApplicationCommandMessage,
  phrase: string
) => any;

export default class StarboardEmoji extends Command {
  converter: ArgumentTypeCaster;

  constructor() {
    super("starboard-emoji", {
      description: (language: Language) =>
        language.get("STARBOARD_EMOJI_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
      slashOnly: true,
      premium: true,
    });
  }

  async run(command: ApplicationCommandMessage, args: { emoji?: string }) {
    if (!this.converter)
      this.converter = this.client.commandHandler.resolver.types.get(
        "emoji"
      ) as unknown as ArgumentTypeCaster;
    let emoji: GuildEmoji | string = defaultEmoji;
    if (discordEmojiRegex.test(args.emoji)) {
      discordEmojiRegex.lastIndex = 0;
      emoji = await this.converter(command, args.emoji);
    } else if (unicodeEmojiRegex.test(args.emoji)) emoji = args.emoji.trim();

    if (!emoji) return await command.error("STARBOARD_EMOJI_INVALID");

    if (emoji == defaultEmoji)
      await command.guild.settings.delete("starboard.emoji", command.author);
    else
      await command.guild.settings.set<string>(
        "starboard.emoji",
        emoji instanceof GuildEmoji ? emoji.id : emoji,
        command.author
      );
    return await command.success("STARBOARD_EMOJI_SET", {
      emoji: emoji.toString(),
    });
  }
}
