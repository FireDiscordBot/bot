import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { ModLogTypeString } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { casual } from "chrono-node";
import { MessageEmbed } from "discord.js";

export default class ModlogsStats extends Command {
  constructor() {
    super("modlogs-moderator-stats", {
      description: (language: Language) =>
        language.get("MODLOGS_MODERATOR_STATS_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "moderator",
          type: "member",
          description: (language: Language) =>
            language.get(
              "MODLOGS_MODERATOR_STATS_ARGUMENT_MODERATOR_DESCRIPTION"
            ),
          required: true,
          default: null,
        },
        {
          id: "time",
          type: "string",
          description: (language: Language) =>
            language.get("MODLOGS_MODERATOR_STATS_ARGUMENT_TIME_DESCRIPTION"),
          required: false,
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
    command: ApplicationCommandMessage | ContextCommandMessage,
    args: { moderator: FireMember; time: string }
  ) {
    if (!args.moderator) return;
    const moderator = args.moderator;
    const time = args.time ? this.parseTimeInput(args.time) : null;
    const stats = await moderator.getModeratorStats(command.guild, time);
    if (!stats)
      return await command.error("MODLOGS_MODERATOR_STATS_NOT_A_MODERATOR");
    else if (Object.values(stats).every((count) => count === 0))
      return await command.error(
        time
          ? "MODLOGS_MODERATOR_STATS_NOT_FOUND_TIME"
          : "MODLOGS_MODERATOR_STATS_NOT_FOUND",
        {
          moderator: moderator.toString(),
        }
      );
    const countsEmbed = new MessageEmbed()
      .setColor(
        moderator
          ? moderator.displayColor || "#FFFFFF"
          : command.member?.displayColor || "#FFFFFF"
      )
      .setTitle(
        command.language.get("MODLOGS_MODERATOR_STATS_TITLE", {
          moderator: moderator.toString(),
        })
      )
      .setTimestamp(time ?? new Date())
      .setFooter({
        text: time
          ? command.language.get("MODLOGS_MODERATOR_STATS_FOOTER", {
              userid: moderator.id,
            })
          : moderator.id,
      });
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

  private parseTimeInput(input: string) {
    const parsed = casual.parseDate(input + " ago", new Date(), {
      forwardDate: false,
    });
    // check if truthy and not older than the bot (because that'd be pointless)
    if (!parsed || +parsed <= 1526136073155) return null;
    return parsed;
  }
}
