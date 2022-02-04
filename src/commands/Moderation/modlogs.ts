import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageEmbed, Util } from "discord.js";

export default class Modlogs extends Command {
  constructor() {
    super("modlogs", {
      description: (language: Language) =>
        language.get("MODLOGS_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
          default: null,
        },
      ],
      context: ["modlogs"],
      restrictTo: "guild",
      moderatorOnly: true,
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: { user: FireMember | FireUser }
  ) {
    if (!args.user) return;
    const logs = await this.client.db
      .query("SELECT * FROM modlogs WHERE uid=$1 AND gid=$2;", [
        args.user.id,
        command.guild.id,
      ])
      .catch(() => {});
    if (!logs || !logs.rows.length)
      return await command.error("MODLOGS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 800);
    for await (const action of logs) {
      paginator.addLine(
        Util.escapeItalic(`**${command.language.get(
          "MODLOGS_CASE_ID"
        )}**: ${action.get("caseid")}
**${command.language.get("REASON")}**: ${action.get("reason")}
**${command.language.get("MODLOGS_MODERATOR_ID")}**: ${
          action.get("modid") || "¯\\\\_(ツ)_/¯"
        }
**${command.language.get("DATE")}**: ${action.get("date")}
**${command.language.get("TYPE")}**: ${titleCase(action.get("type") as string)}
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
