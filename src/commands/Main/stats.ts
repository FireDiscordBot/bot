import { Cluster, Stats as AetherStats } from "../../../lib/interfaces/stats";
import { FireMessage } from "../../../lib/extensions/message";
import { humanFileSize } from "../../../lib/util/clientUtil";
import { MessageEmbed, version as djsver } from "discord.js";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as centra from "centra";
import { totalmem } from "os";

export default class Stats extends Command {
  constructor() {
    super("stats", {
      description: (language: Language) =>
        language.get("STATS_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      restrictTo: "all",
      args: [
        {
          id: "cluster",
          flag: "--cluster",
          match: "option",
          default: null,
          required: false,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { cluster?: string }) {
    if (!this.client.manager.ws) return await this.singularStats(message);
    let clusterStats: Cluster;
    const stats: AetherStats = await (
      await centra(
        process.env.NODE_ENV == "development"
          ? `http://127.0.0.1:${process.env.REST_PORT}/stats`
          : `https://${process.env.REST_HOST}/stats`
      )
        .header("User-Agent", "Fire Discord Bot")
        .send()
    ).json();
    if (!stats.clusters.length) return await this.singularStats(message);
    const clusterId = parseInt(args.cluster?.split(" ")[1]);
    if (args.cluster) {
      clusterStats = stats.clusters.find(
        (cluster) =>
          cluster.id == clusterId &&
          cluster.env == process.env.NODE_ENV.toLowerCase()
      );
      if (!clusterStats)
        clusterStats = stats.clusters.find(
          (cluster) =>
            cluster.id == this.client.manager.id &&
            cluster.env == process.env.NODE_ENV.toLowerCase()
        );
    } else
      clusterStats = stats.clusters.find(
        (cluster) =>
          cluster.id == this.client.manager.id &&
          cluster.env == process.env.NODE_ENV.toLowerCase()
      );
    const embed = new MessageEmbed()
      .setColor(message?.member?.displayColor || "#ffffff")
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
      .setTimestamp(new Date())
      .setFooter(message.language.get("STATS_FOOTER", message))
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
        clusterStats.commands,
        true
      )
      .addField(
        message.language.get("STATS_EVENTS"),
        `${clusterStats.events.toLocaleString(
          message.language.id
        )}/${stats.events.toLocaleString(message.language.id)}`,
        true
      );
    return await message.channel.send(embed);
  }

  async singularStats(message: FireMessage) {
    const stats = await this.client.util.getClusterStats();
    const embed = new MessageEmbed()
      .setColor(message?.member?.displayColor || "#ffffff")
      .setAuthor(
        this.client.user.username,
        this.client.user.displayAvatarURL({ size: 2048, format: "png" })
      )
      .setTitle(message.language.get("STATS_TITLE", stats.name, stats.version))
      .setTimestamp(new Date())
      .setFooter(message.language.get("STATS_FOOTER", message))
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
      .addField(message.language.get("STATS_COMMANDS"), stats.commands, true)
      .addField(
        message.language.get("STATS_EVENTS"),
        stats.events.toLocaleString(message.language.id),
        true
      );
    return await message.channel.send(embed);
  }
}
