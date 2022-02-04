import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Util } from "discord.js";

export default class ClearWarnings extends Command {
  constructor() {
    super("warnings-clear", {
      description: (language: Language) =>
        language.get("WARNINGS_CLEAR_COMMAND_DESCRIPTION"),
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
      restrictTo: "guild",
      moderatorOnly: true,
      parent: "warnings",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user?: FireMember; caseid?: string }
  ) {
    const userOrCaseId = args.user ?? args.caseid;
    if (!userOrCaseId)
      return await command.error("WARNINGS_CLEAR_ARGUMENT_REQUIRED");
    else if (
      userOrCaseId instanceof FireMember &&
      userOrCaseId.isModerator(command.channel) &&
      !userOrCaseId.isAdmin(command.channel) &&
      command.author.id != command.guild.ownerId
    )
      // you can't warn mods anyways
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    if (
      typeof userOrCaseId != "string" &&
      ["clearwarning", "clearwarn"].includes(command.util?.parsed?.alias)
    )
      return await command.error("WARNINGS_CLEAR_CASEID_REQUIRED");
    const typeOrCountResult = await this.client.db
      .query(
        typeof userOrCaseId == "string"
          ? "SELECT type FROM modlogs WHERE gid = $1 AND caseid = $2;"
          : "SELECT COUNT(*) FROM modlogs WHERE gid = $1 AND uid = $2;",
        [
          command.guild.id,
          typeof userOrCaseId == "string" ? userOrCaseId : userOrCaseId.id,
        ]
      )
      .first()
      .catch(() => {});
    if (!typeOrCountResult) return await command.error("WARNINGS_CLEAR_FAILED");
    const type = (typeOrCountResult.get("type") as string) ?? "warn",
      amount = (typeOrCountResult.get("count") as number) ?? 0;
    if (type != "warn" && type != "note")
      return await command.error("WARNINGS_CLEAR_INVALID_CASE_TYPE");
    const cleared = await this.client.db
      .query(
        typeof userOrCaseId == "string"
          ? "DELETE FROM modlogs WHERE gid = $1 AND caseid = $2;"
          : "DELETE FROM modlogs WHERE gid = $1 AND uid = $2;",
        [
          command.guild.id,
          typeof userOrCaseId == "string" ? userOrCaseId : userOrCaseId.id,
        ]
      )
      .catch(() => {});
    // even if it deletes nothing just pretend it works
    return cleared && cleared.status.startsWith("DELETE")
      ? await command.success(
          typeof userOrCaseId == "string"
            ? "WARNINGS_CLEAR_SINGLE_SUCCESS"
            : "WARNINGS_CLEAR_ALL_SUCCESS",
          {
            amount: amount,
            user: Util.escapeMarkdown(userOrCaseId.toString()),
          }
        )
      : await command.error("WARNINGS_CLEAR_FAILED");
  }
}
