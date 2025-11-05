import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Listener } from "@fire/lib/util/listener";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { ChannelSelectMenu, MessageActionRow } from "discord.js";
import Appeals from "../commands/Moderation/appeals";

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
      if (!select.member?.permissions.has(PermissionFlagsBits.ManageChannels))
        return await select.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.ManageChannels,
            select.language
          ),
          command: "starboard limit-channels",
        });

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

    if (select.customId == "appeals:channel") {
      if (!select.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await select.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            select.language
          ),
          command: "appeals",
        });

      select.flags = 64;
      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(guild);
      if (!config)
        return await select.error(
          "APPEALS_CONFIG_UPDATE_FAILED_TO_RETRIEVE_EXISTING"
        );
      const selectedChannelId = select.values[0] as Snowflake;
      if (selectedChannelId == config.channel)
        return await select.error("APPEALS_CONFIG_UPDATE_CHANNEL_ALREADY_SET");
      else if (!select.values.length) {
        await guild.settings.delete("appeals.channel", select.author);
        return await select.success("APPEALS_CONFIG_UPDATE_CHANNEL_RESET");
      }

      const channel = guild.channels.cache.get(selectedChannelId);
      if (
        channel &&
        channel.type == "GUILD_TEXT" &&
        guild.members.me
          .permissionsIn(channel)
          .has(
            PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages
          )
      ) {
        await guild.settings.set(
          "appeals.channel",
          selectedChannelId,
          select.author
        );
        config.channel = selectedChannelId;
        const updatedContainer = appeals.getAppealsContainer(select, config);
        await select.edit({
          components: [updatedContainer],
        });
        await select.success("APPEALS_CONFIG_UPDATE_CHANNEL_SET");
      } else return await select.error("APPEALS_CONFIG_UPDATE_CHANNEL_INVALID");
    }
  }
}
