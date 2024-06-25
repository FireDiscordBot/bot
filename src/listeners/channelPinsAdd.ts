import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { ActionLogTypes } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { MessageEmbed, MessageReference } from "discord.js";

export default class ChannelPinsAdd extends Listener {
  constructor() {
    super("channelPinsAdd", {
      emitter: "client",
      event: "channelPinsAdd",
    });
  }

  async exec(reference: MessageReference, member?: FireMember) {
    const channel = this.client.channels.cache.get(
      reference.channelId
    ) as FireTextChannel;
    if (!channel || channel.type != "GUILD_TEXT") return;
    const guild = channel.guild as FireGuild;
    if (!guild) return;
    const language = guild.language;

    const message = await channel.messages
      .fetch(reference.messageId)
      .catch(() => {});
    if (!message) return;

    if (
      guild.settings.has("log.action") &&
      !guild.logIgnored.includes(channel.id)
    ) {
      const embed = new MessageEmbed()
        .setColor(member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setAuthor({
          name: language.get("PINSADDLOG_AUTHOR", { channel: channel.name }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
          url: message.url,
        })
        .addField(language.get("PINNED_BY"), member.toString())
        .setFooter({ text: `${message.id} | ${member.id} | ${channel.id}` });
      await guild.actionLog(embed, ActionLogTypes.PINS_ADD);
    }
  }
}
