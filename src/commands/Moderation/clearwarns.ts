import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Util } from "discord.js";

export default class ClearWarnings extends Command {
  constructor() {
    super("clearwarnings", {
      description: (language: Language) =>
        language.get("CLEARWARNINGS_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "memberSilent",
          readableType: "user",
          required: false,
          default: null,
        },
        {
          id: "caseid",
          type: "string",
          required: false,
          default: null,
        },
      ],
      aliases: ["clearwarns", "clearwarning", "clearwarn"],
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user?: FireMember; caseid?: string }
  ) {
    const userOrCaseId = args.user ?? args.caseid;
    if (!userOrCaseId)
      return await message.error("CLEARWARNINGS_ARGUMENT_REQUIRED");
    else if (
      userOrCaseId instanceof FireMember &&
      userOrCaseId.isModerator(message.channel) &&
      !userOrCaseId.isAdmin(message.channel) &&
      message.author.id != message.guild.ownerId
    )
      // you can't warn mods anyways
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    if (
      typeof userOrCaseId != "string" &&
      ["clearwarning", "clearwarn"].includes(message.util?.parsed?.alias)
    )
      return await message.error("CLEARWARN_CASEID_REQUIRED");
    const typeOrCountResult = await this.client.db
      .query(
        typeof userOrCaseId == "string"
          ? "SELECT type FROM modlogs WHERE gid = $1 AND caseid = $2;"
          : "SELECT COUNT(*) FROM modlogs WHERE gid = $1 AND uid = $2;",
        [
          message.guild.id,
          typeof userOrCaseId == "string" ? userOrCaseId : userOrCaseId.id,
        ]
      )
      .first()
      .catch(() => {});
    if (!typeOrCountResult) return await message.error("CLEARWARN_FAILED");
    const type = (typeOrCountResult.get("type") as string) ?? "warn",
      amount = (typeOrCountResult.get("count") as number) ?? 0;
    if (type != "warn" && type != "note")
      return await message.error("CLEARWARN_INVALID_CASE_TYPE");
    const cleared = await this.client.db
      .query(
        typeof userOrCaseId == "string"
          ? "DELETE FROM modlogs WHERE gid = $1 AND caseid = $2;"
          : "DELETE FROM modlogs WHERE gid = $1 AND uid = $2;",
        [
          message.guild.id,
          typeof userOrCaseId == "string" ? userOrCaseId : userOrCaseId.id,
        ]
      )
      .catch(() => {});
    // even if it deletes nothing just pretend it works
    return cleared && cleared.status.startsWith("DELETE")
      ? await message.success(
          typeof userOrCaseId == "string"
            ? "CLEARWARN_SINGLE_SUCCESS"
            : "CLEARWARN_ALL_SUCCESS",
          {
            amount: amount,
            user: Util.escapeMarkdown(userOrCaseId.toString()),
          }
        )
      : await message.error("CLEARWARN_FAILED");
  }
}
