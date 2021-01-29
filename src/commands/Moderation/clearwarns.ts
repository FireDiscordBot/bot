import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Argument } from "discord-akairo";

export default class ClearWarnings extends Command {
  constructor() {
    super("clearwarnings", {
      description: (language: Language) =>
        language.get("CLEARWARNINGS_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "userOrCaseID",
          type: Argument.union("memberSilent", "string"),
          readableType: "userOrCaseID",
          required: true,
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
    args: { userOrCaseID: FireMember | string }
  ) {
    if (!args.userOrCaseID) return await message.error("");
    else if (
      args.userOrCaseID instanceof FireMember &&
      args.userOrCaseID.isModerator(message.channel) &&
      !args.userOrCaseID.isAdmin(message.channel) &&
      message.author.id != message.guild.ownerID
    )
      // you can't warn mods anyways
      return await message.error("MODERATOR_ACTION_DISALLOWED");
    if (
      typeof args.userOrCaseID != "string" &&
      ["clearwarning", "clearwarn"].includes(message.util?.parsed?.alias)
    )
      return await message.error("CLEARWARN_CASEID_REQUIRED");
    const types =
      typeof args.userOrCaseID == "string"
        ? ["warn", message.guild.id, args.userOrCaseID]
        : ["warn", message.guild.id, args.userOrCaseID.id];
    const cleared = await this.client.db
      .query(
        typeof args.userOrCaseID == "string"
          ? "DELETE FROM modlogs WHERE type = $1 AND gid = $2 AND caseid = $3;"
          : "DELETE FROM modlogs WHERE type = $1 AND gid = $2 AND uid = $3;",
        types
      )
      .catch(() => {});
    // even if it deletes nothing just pretend it works
    return cleared && cleared.status.startsWith("DELETE")
      ? await message.success()
      : await message.error();
  }
}
