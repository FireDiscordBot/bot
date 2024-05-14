import { MessageEmbed, Permissions, version as djsver } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { humanFileSize } from "@fire/lib/util/clientutil";
import { ClusterStats } from "@fire/lib/interfaces/stats";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as centra from "centra";
import { totalmem } from "os";

export default class Stats extends Command {
  constructor() {
    super("stats", {
      description: (language: Language) =>
        language.get("STATS_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
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
      .setFooter(
        message.language.get("STATS_FOOTER", {
          pid: process.pid,
          cluster: this.client.manager.id,
          shard: message.shard.id,
        })
      )
      .addField(
        message.language.get("GUILDS"),
        `${clusterStats.guilds.toLocaleString(message.language.id)}/${stats
          .map((c) => c.guilds)
          .reduce((a, b) => a + b, 0)
          .toLocaleString(message.language.id)}`,
        true
      )
      .addField(
        message.language.get("USERS"),
        `${clusterStats.users.toLocaleString(message.language.id)}/${stats
          .map((c) => c.users)
          .reduce((a, b) => a + b, 0)
          .toLocaleString(message.language.id)}`,
        true
      )
      .addField(
        message.language.get("STATS_MEMORY_USAGE"),
        `${clusterStats.ram}/${humanFileSize(
          stats.map((c) => c.ramBytes).reduce((a, b) => a + b, 0)
        )}`,
        true
      )
      .addField(message.language.get("STATS_DJS_VER"), djsver, true)
      .addField(
        message.language.get("STATS_NODE_VER"),
        process.version.slice(1),
        true
      )
      .addField(message.language.get("STATS_UPTIME"), clusterStats.uptime, true)
      .addField(
        message.language.get("STATS_COMMANDS"),
        clusterStats.commands.toLocaleString(message.language.id),
        true
      );
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
      .setFooter(
        message.language.get("STATS_FOOTER", {
          pid: process.pid,
          cluster: this.client.manager.id,
          shard: message.shard.id,
        })
      )
      .addField(
        message.language.get("GUILDS"),
        `${stats.guilds.toLocaleString(message.language.id)}`,
        true
      )
      .addField(
        message.language.get("USERS"),
        `${stats.users.toLocaleString(message.language.id)}`,
        true
      )
      .addField(
        message.language.get("STATS_MEMORY_USAGE"),
        `${humanFileSize(process.memoryUsage().heapUsed)}/${humanFileSize(
          totalmem()
        )}`,
        true
      )
      .addField(message.language.get("STATS_DJS_VER"), djsver, true)
      .addField(
        message.language.get("STATS_NODE_VER"),
        process.version.slice(1),
        true
      )
      .addField(message.language.get("STATS_UPTIME"), stats.uptime, true)
      .addField(
        message.language.get("STATS_COMMANDS"),
        stats.commands.toLocaleString(message.language.id),
        true
      );
    return await message.channel.send({ embeds: [embed] });
  }
}
