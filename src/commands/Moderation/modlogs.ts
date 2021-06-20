import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
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
      restrictTo: "guild",
      moderatorOnly: true,
    });
  }

  async exec(message: FireMessage, args: { user: FireMember | FireUser }) {
    if (!args.user) return;
    const logs = await this.client.db
      .query("SELECT * FROM modlogs WHERE uid=$1 AND gid=$2;", [
        args.user.id,
        message.guild.id,
      ])
      .catch(() => {});
    if (!logs || !logs.rows.length)
      return await message.error("MODLOGS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 800);
    for await (const action of logs) {
      paginator.addLine(
        Util.escapeItalic(`**${message.language.get(
          "MODLOGS_CASE_ID"
        )}**: ${action.get("caseid")}
**${message.language.get("REASON")}**: ${action.get("reason")}
**${message.language.get("MODLOGS_MODERATOR_ID")}**: ${
          action.get("modid") || "¯\\\\_(ツ)_/¯"
        }
**${message.language.get("DATE")}**: ${action.get("date")}
**${message.language.get("TYPE")}**: ${titleCase(action.get("type") as string)}
**-----------------**`)
      );
    }
    const embed = new MessageEmbed().setColor("#E67E22").setTimestamp();
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      { owner: message.member, embed }
    );
    return await paginatorInterface.send(message.channel);
  }
}
