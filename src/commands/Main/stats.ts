import { Cluster, Stats as AetherStats } from "@fire/lib/interfaces/stats";
import { MessageEmbed, Permissions, version as djsver } from "discord.js";
import { FireMessage } from "@fire/lib/extensions/message";
import { humanFileSize } from "@fire/lib/util/clientutil";
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
          flag: "--cluster",
          match: "option",
          type: "number",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async exec(message: FireMessage, args: { cluster?: number }) {
    if (!this.client.manager.ws?.open) return await this.singularStats(message);
    let clusterStats: Cluster;
    const stats: AetherStats = await (
      await centra(
        process.env.REST_HOST
          ? `https://${process.env.REST_HOST}/stats`
          : `http://127.0.0.1:${process.env.REST_PORT}/stats`
      )
        .header("User-Agent", this.client.manager.ua)
        .send()
    ).json();
    if (stats.clusters.length <= 1) return await this.singularStats(message);
    const clusterId = args.cluster;
    if (clusterId) {
      clusterStats = stats.clusters.find(
        (cluster) =>
          cluster.id == clusterId &&
          cluster.env == process.env.NODE_ENV.toLowerCase()
      );
      if (!clusterStats) return await message.error("STATS_UNKNOWN_CLUSTER");
    } else
      clusterStats = stats.clusters.find(
        (cluster) =>
          cluster.id == this.client.manager.id &&
          cluster.env == process.env.NODE_ENV.toLowerCase()
      );
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setAuthor(
        this.client.user.username,
        this.client.user.displayAvatarURL({ size: 2048, format: "png" })
      )
      .setTitle(
        message.language.get(
          "STATS_TITLE",
          clusterStats.name,
          clusterStats.version
        )
      )
      .setTimestamp()
      .setFooter(
        message.language.get(
          "STATS_FOOTER",
          this.client.manager.id,
          message.guild?.shardID || 0
        )
      )
      .addField(
        message.language.get("GUILDS"),
        `${clusterStats.guilds.toLocaleString(
          message.language.id
        )}/${stats.guilds.toLocaleString(message.language.id)}`,
        true
      )
      .addField(
        message.language.get("USERS"),
        `${clusterStats.users.toLocaleString(
          message.language.id
        )}/${stats.users.toLocaleString(message.language.id)}`,
        true
      )
      .addField(
        message.language.get("STATS_MEMORY_USAGE"),
        `${clusterStats.ram}/${stats.ram}`,
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
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setAuthor(
        this.client.user.username,
        this.client.user.displayAvatarURL({ size: 2048, format: "png" })
      )
      .setTitle(message.language.get("STATS_TITLE", stats.name, stats.version))
      .setTimestamp()
      .setFooter(
        message.language.get(
          "STATS_FOOTER",
          this.client.manager.id,
          message.guild?.shardID || 0
        )
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
