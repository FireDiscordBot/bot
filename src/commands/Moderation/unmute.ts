import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Unmute extends Command {
  constructor() {
    super("unmute", {
      description: (language: Language) =>
        language.get("UNMUTE_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
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
    if (!args.user) return await message.error("UNMUTE_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(message.channel) &&
      message.author.id != message.guild.ownerId
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    await message.delete().catch(() => {});
    const unmuted = await args.user.unmute(
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      message.channel as FireTextChannel
    );
    if (unmuted == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof unmuted == "string")
      return await message.error(
        (`UNMUTE_FAILED_${unmuted.toUpperCase()}` as unknown) as LanguageKeys
      );
  }
}
