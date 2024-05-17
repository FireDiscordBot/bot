import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { CommandInteractionOption, GuildEmoji, Role } from "discord.js";

export default class EmojiLock extends Command {
  constructor() {
    super("emojilock", {
      description: (language: Language) =>
        language.get("EMOJILOCK_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.ManageEmojisAndStickers],
      userPermissions: [PermissionFlagsBits.ManageEmojisAndStickers],
      args: [
        {
          id: "emoji",
          type: "emoji",
          required: true,
          autocomplete: true,
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

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (!interaction.guild) return [];
    const emojis = await interaction.guild.emojis.fetch();
    return emojis
      .map((emoii) => ({
        name: emoii.name,
        value: emoii.id,
      }))
      .filter((emoji) =>
        emoji.name
          .toLowerCase()
          .includes(focused.value?.toString().toLowerCase())
      );
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
    else {
      const roles = emoji.roles.cache.map((role) => role.toString());
      return await message.success(
        roles.length ? "EMOJILOCK_SUCCESS" : "EMOJILOCK_DISABLED",
        { roles }
      );
    }
  }
}
