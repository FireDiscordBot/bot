import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";

export default class ModlogsStats extends Command {
  constructor() {
    super("modlogs-stats", {
      description: (language: Language) =>
        language.get("MODLOGS_STATS_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
          default: null,
        },
      ],
      context: ["moderation log stats"],
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      parent: "modlogs",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: { user: FireMember | FireUser; type?: string }
  ) {
    if (command instanceof ContextCommandMessage)
      args.user = command.getMemberOrUser(true);
    if (!args.user) return;
    const types: Record<string, number> = {};
    const logs = await this.client.db
      .query("SELECT type FROM modlogs WHERE uid=$1 AND gid=$2;", [
        args.user.id,
        command.guild.id,
      ])
      .catch(() => {});
    if (!logs || !logs.rows.length)
      return await command.error("MODLOGS_NONE_FOUND");
    for await (const action of logs) {
      const type = action.get("type") as string;
      if (!types[type]) types[type] = 1;
      else types[type]++;
    }
    const countsEmbed = new MessageEmbed()
      .setColor(
        args.user instanceof FireMember
          ? args.user.displayColor || "#FFFFFF"
          : command.member?.displayColor || "#FFFFFF"
      )
      .setTimestamp()
      .setFooter({ text: args.user.id });
    countsEmbed.addFields(
      Object.entries(types)
        .filter(([, count]) => !!count)
        .map(([type, count]) => ({
          name: titleCase(type, "_"),
          value: count.toLocaleString(command.language.id),
          inline: true,
        }))
    );
    return await command.channel.send({ embeds: [countsEmbed] });
  }
}
