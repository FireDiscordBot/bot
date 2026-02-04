import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { constants, titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import { Formatters, MessageEmbed } from "discord.js";

export default class Reason extends Command {
  constructor() {
    super("reason", {
      description: (language: Language) =>
        language.get("REASON_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "case",
          type: "string",
          description: (language: Language) =>
            language.get("REASON_COMMAND_CASE_ARGUMENT_DESCRIPTION"),
          default: null,
          required: true,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("REASON_COMMAND_REASON_ARGUMENT_DESCRIPTION"),
          default: null,
          match: "rest",
          required: false,
        },
      ],
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { case: string; reason?: string }
  ) {
    if (!args.case) return await command.error("REASON_MISSING_CASE");
    const result = await this.client.db
      .query<{
        caseid: string;
        reason: string;
        modid: Snowflake;
        created: Date;
        type: string;
      }>(
        "SELECT caseid, reason, modid, created, type FROM modlogs WHERE caseid=$1 AND gid=$2;",
        [args.case, command.guildId]
      )
      .first()
      .catch(() => {});
    if (!result) return await command.error("REASON_UNKNOWN_CASE");
    if (!args.reason) {
      const embed = new MessageEmbed().setColor(
        command.member?.displayColor || "#FFFFFF"
      ).setDescription(`**${command.language.get(
        "MODLOGS_CASE_ID"
      )}**: ${result.caseid}
**${command.language.get("REASON")}**: ${result.reason}
**${command.language.get("MODLOGS_MODERATOR_ID")}**: ${
        result.modid || constants.escapedShruggie
      }
**${command.language.get("DATE")}**: ${Formatters.time(result.created, "f")}
**${command.language.get("TYPE")}**: ${titleCase(result.type)}`);
      return await command.channel.send({ embeds: [embed] });
    } else {
      const updated = await this.client.db
        .query("UPDATE modlogs SET reason=$1 WHERE caseid=$2 AND gid=$3;", [
          args.reason,
          args.case,
          command.guildId,
        ])
        .catch(() => {});
      return updated && updated.status.startsWith("UPDATE ")
        ? await command.success("REASON_SUCCESSFULLY_UPDATED", {
            case: args.case,
            reason: args.reason,
          })
        : await command.error("REASON_UPDATE_FAILED");
    }
  }
}
