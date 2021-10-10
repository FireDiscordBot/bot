import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageEmbed, Util } from "discord.js";

export default class Warnings extends Command {
  constructor() {
    super("warnings", {
      description: (language: Language) =>
        language.get("WARNINGS_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
          default: null,
        },
      ],
      restrictTo: "guild",
      moderatorOnly: true,
      aliases: ["warns"],
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser }
  ) {
    if (!args.user) return;
    const warnings = await this.client.db
      .query("SELECT * FROM modlogs WHERE uid=$1 AND gid=$2 AND type=$3;", [
        args.user.id,
        command.guild.id,
        "warn",
      ])
      .catch(() => {});
    if (!warnings || !warnings.rows.length)
      return await command.error("WARNINGS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 800);
    for await (const warn of warnings) {
      paginator.addLine(
        Util.escapeItalic(`**${command.language.get(
          "MODLOGS_CASE_ID"
        )}**: ${warn.get("caseid")}
**${command.language.get("REASON")}**: ${warn.get("reason")}
**${command.language.get("MODLOGS_MODERATOR_ID")}**: ${
          warn.get("modid") || "¯\\\\_(ツ)_/¯"
        }
**${command.language.get("DATE")}**: ${warn.get("date")}
**-----------------**`)
      );
    }
    const embed = new MessageEmbed()
      .setFooter(args.user.id)
      .setColor("#E67E22")
      .setTimestamp();
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      { owner: command.member, embed }
    );
    return await paginatorInterface.send(command.channel);
  }
}
