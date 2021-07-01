import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { parseTime } from "@fire/lib/util/constants";
import { Command } from "@fire/lib/util/command";

export default class Mute extends Command {
  constructor() {
    super("mute", {
      description: (language: Language) =>
        language.get("MUTE_COMMAND_DESCRIPTION"),
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
      aliases: ["silence", "tempmute", "403"],
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember; reason?: string }
  ) {
    if (!args.user) return await message.error("MUTE_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      (args.user.isModerator(message.channel) || args.user.user.bot) &&
      message.author.id != message.guild.ownerID
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    let minutes: number;
    try {
      minutes = parseTime(args.reason) as number;
    } catch {
      return await message.error("MUTE_FAILED_PARSE_TIME");
    }
    if (minutes != 0 && minutes < 5)
      return await message.error("MUTE_TIME_TOO_SHORT");
    const now = new Date();
    let date: number;
    if (minutes) date = now.setMinutes(now.getMinutes() + minutes);
    const reason = parseTime(args.reason, true) as string;
    await message.delete().catch(() => {});
    const muted = await args.user.mute(
      reason ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      message.member,
      date,
      message.channel as FireTextChannel
    );
    if (muted == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof muted == "string")
      return await message.error(`MUTE_FAILED_${muted.toUpperCase()}` as LanguageKeys);
  }
}
