import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Derank extends Command {
  constructor() {
    super("derank", {
      description: (language: Language) =>
        language.get("DERANK_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "memberSilent",
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
    args: { user: FireMember; reason?: string }
  ) {
    if (!args.user) return await message.error("DERANK_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(message.channel) &&
      message.author.id != message.guild.ownerId
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    await message.delete().catch(() => {});
    const deranked = await args.user.derank(
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      message.channel as FireTextChannel
    );
    if (deranked == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof deranked == "string")
      return await message.error(
        (`DERANK_FAILED_${deranked.toUpperCase()}` as unknown) as LanguageKeys
      );
  }
}
