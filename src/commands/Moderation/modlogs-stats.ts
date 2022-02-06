import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { ModLogType, titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";

export default class ModlogsStats extends Command {
  constructor() {
    super("modlogs-stats", {
      description: (language: Language) =>
        language.get("MODLOGS_STATS_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
          default: null,
        },
      ],
      context: ["moderaction log stats"],
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
    if (!args.user) return;
    const types: Record<ModLogType, number> = {
      system: 0,
      warn: 0,
      note: 0,
      ban: 0,
      unban: 0,
      kick: 0,
      block: 0,
      unblock: 0,
      derank: 0,
      mute: 0,
      unmute: 0,
      role_persist: 0,
      blacklist: 0,
      unblacklist: 0,
    };
    const logs = await this.client.db
      .query("SELECT type FROM modlogs WHERE uid=$1 AND gid=$2;", [
        args.user.id,
        command.guild.id,
      ])
      .catch(() => {});
    if (!logs || !logs.rows.length)
      return await command.error("MODLOGS_NONE_FOUND");
    for await (const action of logs) {
      const type = action.get("type") as ModLogType;
      types[type]++;
    }
    const countsEmbed = new MessageEmbed()
      .setColor("#E67E22")
      .setTimestamp()
      .setFooter(args.user.id);
    for (const [type, count] of Object.entries(types)) {
      if (count)
        countsEmbed.addField(
          titleCase(type, "_"),
          count.toLocaleString(command.language.id),
          true
        );
    }
    return await command.channel.send({ embeds: [countsEmbed] });
  }
}
