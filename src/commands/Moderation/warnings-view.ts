import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { MessageEmbed, Util } from "discord.js";

export default class Warnings extends Command {
  constructor() {
    super("warnings-view", {
      description: (language: Language) =>
        language.get("WARNINGS_VIEW_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          type: "user|member",
          description: (language: Language) =>
            language.get("WARNINGS_VIEW_ARGUMENT_USER_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      moderatorOnly: true,
      restrictTo: "guild",
      deferAnyways: true,
      parent: "warnings",
      slashOnly: true,
      ephemeral: true,
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
          warn.get("modid") || constants.escapedShruggie
        }
**${command.language.get("DATE")}**: ${warn.get("date")}
**-----------------**`)
      );
    }
    const embed = new MessageEmbed()
      .setFooter({ text: args.user.id })
      .setColor(
        args.user instanceof FireMember
          ? args.user.displayColor || "#FFFFFF"
          : command.member?.displayColor || "#FFFFFF"
      )
      .setTimestamp();
    const footer = {
      text: command.language.get("WARNINGS_VIEW_FOOTER", {
        count: warnings.rows.length,
      }),
    };
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      { owner: command.member, embed, footer }
    );
    return await paginatorInterface.send(command.channel);
  }
}
