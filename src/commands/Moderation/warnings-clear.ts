import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class ClearWarnings extends Command {
  constructor() {
    super("warnings-clear", {
      description: (language: Language) =>
        language.get("WARNINGS_CLEAR_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          type: "memberSilent",
          description: (language: Language) =>
            language.get("WARNINGS_CLEAR_ARGUMENT_USER_DESCRIPTION"),
          readableType: "user",
          required: false,
          default: null,
        },
        {
          id: "caseid",
          type: "string",
          description: (language: Language) =>
            language.get("WARNINGS_CLEAR_ARGUMENT_CASEID_DESCRIPTION"),
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
    if (args.user && args.caseid)
      return await command.error("WARNINGS_CLEAR_ARGUMENTS_EXCLUSIVE");
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

    // we'll get the count first so we know if there's even anything to delete
    const available = await this.client.db
      .query(
        typeof userOrCaseId == "string"
          ? "SELECT count(caseid) FROM modlogs WHERE gid = $1 AND caseid = $2 AND type=ANY(array['warn','note']);"
          : "SELECT count(caseid) FROM modlogs WHERE gid = $1 AND uid = $2 AND type=ANY(array['warn','note']);",
        [
          command.guildId,
          typeof userOrCaseId == "string" ? userOrCaseId : userOrCaseId.id,
        ]
      )
      .first()
      .then((r) => r.get("count") as bigint)
      .catch(() => 0n);
    if (available <= 0n)
      return await command.error(
        typeof userOrCaseId == "string"
          ? "WARNINGS_CLEAR_SINGLE_NONE_FOUND"
          : "WARNINGS_CLEAR_ALL_NONE_FOUND"
      );

    // and now we run the delete, making sure we only target warn & note
    const cleared = await this.client.db
      .query(
        typeof userOrCaseId == "string"
          ? "DELETE FROM modlogs WHERE gid = $1 AND caseid = $2 AND type=ANY(array['warn','note']);"
          : "DELETE FROM modlogs WHERE gid = $1 AND uid = $2 AND type=ANY(array['warn','note']);",
        [
          command.guildId,
          typeof userOrCaseId == "string" ? userOrCaseId : userOrCaseId.id,
        ]
      )
      .catch(() => {});

    // even if it deletes nothing just pretend it works
    // but realistically it always should due to the count check
    return cleared && cleared.status.startsWith("DELETE")
      ? await command.success(
          typeof userOrCaseId == "string"
            ? "WARNINGS_CLEAR_SINGLE_SUCCESS"
            : "WARNINGS_CLEAR_ALL_SUCCESS",
          {
            amount: cleared.status.split(" ")[1],
            user:
              typeof userOrCaseId == "string"
                ? undefined
                : userOrCaseId.toMention(),
          }
        )
      : await command.error("WARNINGS_CLEAR_FAILED");
  }
}
