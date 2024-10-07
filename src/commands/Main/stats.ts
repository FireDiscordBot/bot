import { FireMessage } from "@fire/lib/extensions/message";
import { ClusterStats } from "@fire/lib/interfaces/stats";
import { humanFileSize } from "@fire/lib/util/clientutil";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed, version as djsver } from "discord.js";
import { totalmem } from "os";

export default class Stats extends Command {
  constructor() {
    super("stats", {
      description: (language: Language) =>
        language.get("STATS_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      restrictTo: "all",
      args: [
        {
          id: "cluster",
          type: "number",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async exec(message: FireMessage, args: { cluster?: number }) {
    if (
      !this.client.manager.ws?.open ||
      !this.client.manager.REST_HOST ||
      args.cluster == this.client.manager.id
    )
      return await this.singularStats(message);
    let clusterStats: ClusterStats;
    const stats: ClusterStats[] = await (
      await centra(
        `${this.client.manager.REST_HOST}/${this.client.manager.CURRENT_REST_VERSION}/stats`
      )
        .header("User-Agent", this.client.manager.ua)
        .send()
    ).json();
    if (stats.length <= 1) return await this.singularStats(message);
    const clusterId = args.cluster;
    if (typeof clusterId == "number") {
      clusterStats = stats.find(
        (cluster) =>
          cluster.id == clusterId &&
          cluster.env == process.env.NODE_ENV.toLowerCase()
      );
      if (!clusterStats) return await message.error("STATS_UNKNOWN_CLUSTER");
    } else
      clusterStats = stats.find(
        (cluster) =>
          cluster.id == this.client.manager.id &&
          cluster.env == process.env.NODE_ENV.toLowerCase()
      );
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setAuthor({
        name: this.client.user.username,
        iconURL: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
      })
      .setTitle(
        message.language.get("STATS_TITLE", {
          name: clusterStats.name,
          version: clusterStats.version,
        })
      )
      .setTimestamp()
      .setFooter({
        text: message.language.get("STATS_FOOTER", {
          pid: process.pid,
          cluster: this.client.manager.id,
          shard: message.shard.id,
        }),
      })
      .addFields([
        {
          name: message.language.get("GUILDS"),
          value: `${clusterStats.guilds.toLocaleString(
            message.language.id
          )}/${stats
            .map((c) => c.guilds)
            .reduce((a, b) => a + b, 0)
            .toLocaleString(message.language.id)}`,
          inline: true,
        },
        {
          name: message.language.get("USERS"),
          value: `${clusterStats.users.toLocaleString(
            message.language.id
          )}/${stats
            .map((c) => c.users)
            .reduce((a, b) => a + b, 0)
            .toLocaleString(message.language.id)}`,
          inline: true,
        },
        {
          name: message.language.get("STATS_MEMORY_USAGE"),
          value: `${clusterStats.ram}/${humanFileSize(
            stats.map((c) => c.ramBytes).reduce((a, b) => a + b, 0)
          )}`,
          inline: true,
        },
        {
          name: message.language.get("STATS_DJS_VER"),
          value: djsver,
          inline: true,
        },

        {
          name: message.language.get("STATS_NODE_VER"),
          value: process.version.slice(1),
          inline: true,
        },
        {
          name: message.language.get("STATS_UPTIME"),
          value: clusterStats.uptime,
          inline: true,
        },
        {
          name: message.language.get("STATS_COMMANDS"),
          value: clusterStats.commands.toLocaleString(message.language.id),
          inline: true,
        },
      ]);
    return await message.channel.send({ embeds: [embed] });
  }

  async singularStats(message: FireMessage) {
    const stats = await this.client.util.getClusterStats();
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setAuthor({
        name: this.client.user.username,
        iconURL: this.client.user.displayAvatarURL({
          size: 2048,
          format: "png",
        }),
      })
      .setTitle(
        message.language.get("STATS_TITLE", {
          name: stats.name,
          version: stats.version,
        })
      )
      .setTimestamp()
      .setFooter({
        text: message.language.get("STATS_FOOTER", {
          pid: process.pid,
          cluster: this.client.manager.id,
          shard: message.shard.id,
        }),
      })
      .addFields([
        {
          name: message.language.get("GUILDS"),
          value: `${stats.guilds.toLocaleString(message.language.id)}`,
          inline: true,
        },
        {
          name: message.language.get("USERS"),
          value: `${stats.users.toLocaleString(message.language.id)}`,
          inline: true,
        },
        {
          name: message.language.get("STATS_MEMORY_USAGE"),
          value: `${humanFileSize(
            process.memoryUsage().heapUsed
          )}/${humanFileSize(totalmem())}`,
          inline: true,
        },
        {
          name: message.language.get("STATS_DJS_VER"),
          value: djsver,
          inline: true,
        },
        {
          name: message.language.get("STATS_NODE_VER"),
          value: process.version.slice(1),
          inline: true,
        },
        {
          name: message.language.get("STATS_UPTIME"),
          value: stats.uptime,
          inline: true,
        },
        {
          name: message.language.get("STATS_COMMANDS"),
          value: stats.commands.toLocaleString(message.language.id),
          inline: true,
        },
      ]);
    return await message.channel.send({ embeds: [embed] });
  }
}
