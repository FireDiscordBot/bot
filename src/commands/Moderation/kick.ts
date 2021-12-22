import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Kick extends Command {
  constructor() {
    super("kick", {
      description: (language: Language) =>
        language.get("KICK_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      clientPermissions: [Permissions.FLAGS.KICK_MEMBERS],
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
      aliases: ["yeet", "409"],
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember; reason?: string }
  ) {
    if (!args.user) return await message.error("KICK_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(message.channel) &&
      message.author.id != message.guild.ownerId
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    await message.delete().catch(() => {});
    const yeeted = await args.user.yeet(
      args.reason?.trim() ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      message.silent ? undefined : (message.channel as FireTextChannel)
    );
    if (yeeted == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof yeeted == "string")
      return await message.error(
        (`KICK_FAILED_${yeeted.toUpperCase()}` as unknown) as LanguageKeys
      );
  }
}
