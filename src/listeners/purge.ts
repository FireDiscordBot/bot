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
      .setColor(message.member?.displayColor || "#FFFFFF")
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
      .setFooter({
        text: message.guild.language.get("PURGE_LOG_FOOTER", {
          user: message.author.id,
          channel: message.channelId,
        }),
      });
    if (reason)
      embed.addFields({
        name: message.guild.language.get("REASON"),
        value: reason,
      });
    if (purged.length) {
      try {
        embed.addFields({
          name: message.guild.language.get("PURGED_MESSAGES"),
          value: await this.client.util.haste(JSON.stringify(purged, null, 4)),
        });
      } catch {
        embed.addFields({
          name: message.guild.language.get("PURGED_MESSAGES"),
          value: message.guild.language.get("PURGED_MESSAGES_FAILED"),
        });
      }
    }
    return await message.guild.actionLog(embed, ActionLogTypes.PURGE);
  }
}
