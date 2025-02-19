import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import {
  constants,
  ModLogTypesEnumToString,
  titleCase,
} from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { CommandInteractionOption, MessageEmbed, Util } from "discord.js";

export default class ModlogsView extends Command {
  constructor() {
    super("modlogs-view", {
      description: (language: Language) =>
        language.get("MODLOGS_COMMAND_DESCRIPTION"),
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
      context: ["moderation logs"],
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      parent: "modlogs",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    if (focused.name != "type") return [];
    // allows it to be immediately updated rather than waiting for the command to propogates
    return Object.values(ModLogTypesEnumToString).filter((type) =>
      focused.value ? type.includes(focused.value.toString()) : true
    );
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: { user: FireMember | FireUser; type?: string }
  ) {
    if (command instanceof ContextCommandMessage)
      args.user = command.getMemberOrUser(true);
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
    const reasonIndex = logs.names.indexOf("reason");
    const longestReason = logs.rows.reduce((a, b) => {
      const l = (b[reasonIndex] as string).length;
      return a > l ? a : l;
    }, 0);
    const paginator = new WrappedPaginator("", "", 800 + longestReason);
    // 800 + longest reason length should hopefully make it high enough for adding each case
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
          action.get("modid") || constants.escapedShruggie
        }
**${command.language.get("DATE")}**: ${action.get("date")}${typeInfo}
**-----------------**`)
      );
    }
    const embed = new MessageEmbed()
      .setColor(
        args.user instanceof FireMember
          ? args.user.displayColor || "#FFFFFF"
          : command.member?.displayColor || "#FFFFFF"
      )
      .setTimestamp();
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
