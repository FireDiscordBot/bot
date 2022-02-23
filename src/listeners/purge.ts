import { FireMessage } from "@fire/lib/extensions/message";
import { ActionLogTypes } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { MessageEmbed } from "discord.js";

export default class Purge extends Listener {
  constructor() {
    super("purge", {
      emitter: "client",
      event: "purge",
    });
  }

  async exec(message: FireMessage, reason?: string, purged = []) {
    if (message.guild.logIgnored.includes(message.channelId)) return;
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(
        message.guild.language.get("PURGE_LOG_DESCRIPTION", {
          amount: purged.length,
          channel: message.channel.toString(),
        })
      )
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(
        message.guild.language.get("PURGE_LOG_FOOTER", {
          user: message.author.id,
          channel: message.channelId,
        })
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
    return await message.guild.actionLog(embed, ActionLogTypes.PURGE);
  }
}
