import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";

export default class Warn extends Command {
  constructor() {
    super("warn", {
      description: (language: Language) =>
        language.get("WARN_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "member",
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          required: true,
          default: null,
          match: "rest",
        },
      ],
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(message: FireMessage, args: { user: FireMember; reason: string }) {
    if (!args.user) return;
    else if (
      (args.user.isModerator(message.channel) || args.user.user.bot) &&
      message.author.id != message.guild.ownerId
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    if (!args.reason) return await message.error("WARN_REASON_MISSING");
    await message.delete().catch(() => {});
    const warned = await args.user.warn(
      args.reason,
      message.member,
      message.channel as FireTextChannel
    );
    if (warned == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof warned == "string")
      return await message.error(
        (`WARN_FAILED_${warned.toUpperCase()}` as unknown) as LanguageKeys
      );
  }
}
