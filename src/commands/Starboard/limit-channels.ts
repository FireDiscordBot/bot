import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { ChannelSelectMenu, MessageActionRow } from "discord.js";

export default class StarboardLimitChannels extends Command {
  constructor() {
    super("starboard-limit-channels", {
      description: (language: Language) =>
        language.get("STARBOARD_LIMIT_CHANNELS_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageChannels],
      restrictTo: "guild",
      parent: "starboard",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const current = command.guild.settings.get("starboard.limitchannels", []);
    const select = new ChannelSelectMenu()
      .setCustomId("starboard-limit-channels")
      .setPlaceholder(
        command.language.get("STARBOARD_LIMIT_CHANNELS_SELECT_PLACEHOLDER")
      )
      .setMinValues(0)
      .setMaxValues(25);
    if (current.length)
      select.setDefaultValues(
        current.map((current) => ({ type: "channel", id: current }))
      );
    const row = new MessageActionRow().addComponents(select);
    return await command.send("STARBOARD_LIMIT_CHANNELS_MESSAGE", {
      components: [row],
    });
  }
}
