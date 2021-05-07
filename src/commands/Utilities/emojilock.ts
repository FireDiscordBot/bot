import { FireMessage } from "@fire/lib/extensions/message";
import { GuildEmoji, Permissions, Role } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class EmojiLock extends Command {
  constructor() {
    super("emojilock", {
      description: (language: Language) =>
        language.get("EMOJILOCK_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_EMOJIS],
      userPermissions: [Permissions.FLAGS.MANAGE_EMOJIS],
      args: [
        {
          id: "emoji",
          type: "emoji",
          required: true,
          default: null,
        },
        {
          id: "role",
          type: "role",
          required: true,
          default: undefined,
        },
      ],
      aliases: [
        "lockemoji",
        "emojirole",
        "emojiroles",
        "rolemoji",
        "rolemojis",
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { emoji: GuildEmoji; role: Role }) {
    if (!args.emoji || args.emoji?.guild?.id != message.guild.id)
      return await message.error("EMOJILOCK_INVALID_EMOJI");
    else if (typeof args.role == "undefined")
      return await message.error("EMOJILOCK_INVALID_ROLE");
    else if (!args.role) return;
    let emoji = await message.guild.emojis
      .fetch()
      .then((emojis) => emojis.get(args.emoji.id));
    let roles = emoji.roles.cache.map((role) => role.id);
    if (roles.includes(args.role.id))
      roles = roles.filter((role) => role != args.role.id);
    else roles.push(args.role.id);

    emoji = (await emoji.edit({ roles }).catch(() => {})) as GuildEmoji;
    if (!emoji) return await message.error("EMOJILOCK_FAILURE");
    else
      return await message.success(
        "EMOJILOCK_SUCCESS",
        emoji.roles.cache.map((role) => role.toString())
      );
  }
}
