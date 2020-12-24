import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { MessageEmbed } from "discord.js";

export default class Purge extends Listener {
  constructor() {
    super("purge", {
      emitter: "client",
      event: "purge",
    });
  }

  async exec(message: FireMessage, reason?: string, purged = []) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#ffffff")
      .setTimestamp(new Date())
      .setDescription(
        message.guild.language.get(
          "PURGE_LOG_DESCRIPTION",
          purged.length,
          message.channel.toString()
        )
      )
      .setAuthor(
        message.author.toString(),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(
        message.guild.language.get(
          "PURGE_LOG_FOOTER",
          message.author.id,
          message.channel.id
        )
      );
    if (reason) embed.addField(message.guild.language.get("REASON"), reason);
    if (purged.length) {
      try {
        embed.addField(
          message.guild.language.get("PURGED_MESSAGES"),
          await this.client.util.haste(JSON.stringify(purged, null, 4)),
          false
        );
      } catch {
        embed.addField(
          message.guild.language.get("PURGED_MESSAGES"),
          message.guild.language.get("PURGED_MESSAGES_FAILED"),
          false
        );
      }
    }
    return await message.guild.actionLog(embed);
  }
}
