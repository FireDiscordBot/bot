import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";

export default class Ban extends Command {
  constructor() {
    super("ban", {
      description: (language: Language) =>
        language.get("BAN_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
          default: null,
        },
        {
          id: "days",
          flag: "--days",
          match: "option",
          required: false,
          type: "number",
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

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser; days?: number; reason: string }
  ) {
    if (!args.user) return await message.error("BAN_USER_REQUIRED");
    else if (
      args.user instanceof FireMember &&
      args.user.isModerator(message.channel)
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    if (args.days && (args.days < 1 || args.days > 7))
      return await message.error("BAN_REASON_MISSING");
    await message.delete().catch(() => {});
    const beaned =
      args.user instanceof FireMember
        ? await args.user.bean(
            args.reason ||
              (message.guild.language.get(
                "MODERATOR_ACTION_DEFAULT_REASON"
              ) as string),
            message.member,
            args.days || 0,
            message.channel as TextChannel
          )
        : await args.user.bean(
            message.guild,
            args.reason ||
              (message.guild.language.get(
                "MODERATOR_ACTION_DEFAULT_REASON"
              ) as string),
            message.member,
            args.days || 0,
            message.channel as TextChannel
          );
    if (beaned == "forbidden")
      return await message.error("COMMAND_MODERATOR_ONLY");
    else if (typeof beaned == "string")
      return await message.error(`BAN_FAILED_${beaned.toUpperCase()}`);
  }
}
