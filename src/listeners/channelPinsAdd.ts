import { MessageReference, MessageEmbed, TextChannel } from "discord.js";
import { FireMember } from "../../lib/extensions/guildmember";
import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";

export default class ChannelPinsAdd extends Listener {
  constructor() {
    super("channelPinsAdd", {
      emitter: "client",
      event: "channelPinsAdd",
    });
  }

  async exec(reference: MessageReference, member?: FireMember) {
    const channel = this.client.channels.cache.get(
      reference.channelID
    ) as TextChannel;
    if (!channel || channel.type != "text") return;
    const guild = channel.guild as FireGuild;
    if (!guild) return;
    const language = guild.language;

    const message = await channel.messages
      .fetch(reference.messageID)
      .catch(() => {});
    if (!message) return;

    if (
      guild.settings.has("log.action") &&
      !guild.logIgnored.includes(channel.id)
    ) {
      const embed = new MessageEmbed()
        .setColor(member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setAuthor(
          language.get("PINSADDLOG_AUTHOR", channel.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true }),
          message.url
        )
        .addField(language.get("PINNED_BY"), member.toString())
        .setFooter(`${message.id} | ${member.id} | ${channel.id}`);
      await guild.actionLog(embed, "pins_add");
    }
  }
}
