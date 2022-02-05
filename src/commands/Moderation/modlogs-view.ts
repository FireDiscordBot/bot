import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { ModLogType, titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { CommandInteractionOption, MessageEmbed, Util } from "discord.js";

export default class ModlogsView extends Command {
  constructor() {
    super("modlogs-view", {
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
        {
          id: "type",
          type: "string",
          required: false,
          autocomplete: true,
          default: null,
        },
      ],
      context: ["modlogs"],
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      parent: "modlogs",
      slashOnly: true,
      ephemeral: true,
    });
  }

  // TODO: implement after autocomplete is fixed
  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.name != "type") return [];
    return [];
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: { user: FireMember | FireUser; type?: string }
  ) {
    if (!args.user) return;
    const logs = await this.client.db
      .query(
        args.type
          ? "SELECT * FROM modlogs WHERE uid=$1 AND gid=$2 AND type=$3;"
          : "SELECT * FROM modlogs WHERE uid=$1 AND gid=$2;",
        args.type
          ? [args.user.id, command.guild.id, args.type]
          : [args.user.id, command.guild.id]
      )
      .catch(() => {});
    if (!logs || !logs.rows.length)
      return await command.error("MODLOGS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 800);
    for await (const action of logs) {
      let typeInfo: string = "";
      if (!args.type)
        typeInfo = `\n**${command.language.get("TYPE")}**: ${titleCase(
          action.get("type") as string,
          "_"
        )}`;
      paginator.addLine(
        Util.escapeItalic(`**${command.language.get(
          "MODLOGS_CASE_ID"
        )}**: ${action.get("caseid")}
**${command.language.get("REASON")}**: ${action.get("reason")}
**${command.language.get("MODLOGS_MODERATOR_ID")}**: ${
          action.get("modid") || "¯\\\\_(ツ)_/¯"
        }
**${command.language.get("DATE")}**: ${action.get("date")}${typeInfo}
**-----------------**`)
      );
    }
    const embed = new MessageEmbed().setColor("#E67E22").setTimestamp();
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      {
        owner: command.member,
        embed,
      }
    );
    return await paginatorInterface.send(command.channel);
  }
}
