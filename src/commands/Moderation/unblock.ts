import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Role } from "discord.js";

export default class Unblock extends Command {
  constructor() {
    super("unblock", {
      description: (language: Language) =>
        language.get("UNBLOCK_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "tounblock",
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
    args: { tounblock: FireMember | Role; reason?: string }
  ) {
    if (!args.tounblock) return await message.error("UNBLOCK_ARG_REQUIRED");
    else if (
      args.tounblock instanceof FireMember &&
      args.tounblock.isModerator(message.channel) &&
      message.author.id != message.guild.ownerID
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    await message.delete().catch(() => {});
    const blocked = await message.guild.unblock(
      args.tounblock,
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      message.channel as FireTextChannel
    );
    if (blocked == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof blocked == "string")
      return await message.error(`UNBLOCK_FAILED_${blocked.toUpperCase()}`);
  }
}
