import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { ModLogTypeString } from "@fire/lib/util/constants";
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
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      parent: "modlogs",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser; type?: string }
  ) {
    if (!args.user) return;
    const user = args.user instanceof FireMember ? args.user.user : args.user;
    const member = args.user instanceof FireMember ? args.user : null;
    const stats = await user.getModLogStats(command.guild, false);
    const countsEmbed = new MessageEmbed()
      .setColor(
        member
          ? member.displayColor || "#FFFFFF"
          : command.member?.displayColor || "#FFFFFF"
      )
      .setTimestamp()
      .setFooter({ text: args.user.id });
    countsEmbed.addFields(
      Object.entries(stats)
        .filter(([, count]) => !!count)
        .map(([type, count]: [ModLogTypeString, number]) => ({
          name: command.language.get(`MODLOGS_TYPES.${type}`),
          value: count.toLocaleString(command.language.id),
          inline: true,
        }))
    );
    return await command.channel.send({ embeds: [countsEmbed] });
  }
}
