import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireVoiceChannel } from "@fire/lib/extensions/voicechannel";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { NewsChannel, Permissions, Role, ThreadChannel } from "discord.js";

export default class Block extends Command {
  constructor() {
    super("block", {
      description: (language: Language) =>
        language.get("BLOCK_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "toblock",
          type: "member|role",
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          required: false,
          default: null,
          match: "rest",
        },
      ],
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { toblock: FireMember | Role; reason?: string }
  ) {
    if (!args.toblock) return await message.error("BLOCK_ARG_REQUIRED");
    else if (
      args.toblock instanceof FireMember &&
      args.toblock.isModerator(message.channel) &&
      message.author.id != message.guild.ownerId
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    else if (
      args.toblock instanceof FireMember &&
      args.toblock.roles.highest.rawPosition >=
        message.member?.roles?.highest?.rawPosition
    )
      return await message.error("BLOCK_GOD");
    else if (
      args.toblock instanceof Role &&
      args.toblock.rawPosition >= message.member?.roles?.highest?.rawPosition
    )
      return await message.error("BLOCK_ROLE_HIGH");

    let channel = message.channel as
      | FireTextChannel
      | FireVoiceChannel
      | NewsChannel
      | ThreadChannel;
    if (channel instanceof ThreadChannel)
      channel = channel.parent as FireTextChannel | NewsChannel;

    await message.delete().catch(() => {});
    const blocked = await message.guild.block(
      args.toblock,
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      channel
    );
    if (blocked == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof blocked == "string")
      return await message.error(
        (`BLOCK_FAILED_${blocked.toUpperCase()}` as unknown) as LanguageKeys
      );
  }
}
