import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed, Snowflake } from "discord.js";

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

  async exec(message: FireMessage, args: { case: string; reason?: string }) {
    if (!args.case) return await message.error("REASON_MISSING_CASE");
    const result = await this.client.db
      .query("SELECT * FROM modlogs WHERE caseid=$1 AND gid=$2;", [
        args.case,
        message.guildId,
      ])
      .first()
      .catch(() => {});
    if (!result) return await message.error("REASON_UNKNOWN_CASE");
    if (!args.reason) {
      const embed = new MessageEmbed().setColor(
        message.member?.displayHexColor ?? "#FFFFFF"
      ).setDescription(`**${message.language.get(
        "MODLOGS_CASE_ID"
      )}**: ${result.get("caseid")}
**${message.language.get("REASON")}**: ${result.get("reason")}
**${message.language.get("MODLOGS_MODERATOR_ID")}**: ${
        result.get("modid") || "¯\\\\_(ツ)_/¯"
      }
**${message.language.get("DATE")}**: ${result.get("date")}
**${message.language.get("TYPE")}**: ${titleCase(
        result.get("type") as string
      )}`);
      return await message.channel.send({ embeds: [embed] });
    } else {
      const updated = await this.client.db
        .query("UPDATE modlogs SET reason=$1 WHERE caseid=$2 AND gid=$3;", [
          args.reason,
          args.case,
          message.guildId,
        ])
        .catch(() => {});
      return updated && updated.status.startsWith("UPDATE ")
        ? await message.success("REASON_SUCCESSFULLY_UPDATED", {
            case: args.case,
            reason: args.reason,
          })
        : await message.error("REASON_UPDATE_FAILED");
    }
  }
}
