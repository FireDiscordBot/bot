import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Listener } from "@fire/lib/util/listener";
import { ChannelSelectMenu, MessageActionRow } from "discord.js";

export default class ChannelSelect extends Listener {
  constructor() {
    super("channelSelect", {
      emitter: "client",
      event: "channelSelect",
    });
  }

  async exec(select: ComponentMessage) {
    if (select.type != "CHANNEL_SELECT") return;

    const guild = select.guild;

    if (select.customId == "starboard-limit-channels") {
      const channels = select.values,
        row = select.message.components[0] as MessageActionRow;
      if (channels.length) {
        await guild.settings.set(
          "starboard.limitchannels",
          channels,
          select.author
        );
        (row.components[0] as unknown as ChannelSelectMenu).setDefaultValues(
          channels.map((c) => ({ type: "channel", id: c }))
        );
      } else {
        await guild.settings.delete("starboard.limitchannels", select.author);
        (row.components[0] as unknown as ChannelSelectMenu).setDefaultValues(
          []
        );
      }
      await select
        .edit({
          components: [row],
        })
        .catch(() => {});
      return await select.success(
        channels.length
          ? "STARBOARD_LIMIT_CHANNELS_SET"
          : "STARBOARD_LIMIT_CHANNELS_RESET",
        { channels: channels.map((c) => `<#${c}>`).join(", ") }
      );
    }
  }
}
