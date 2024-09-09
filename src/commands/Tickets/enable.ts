import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { CategoryChannel, Snowflake } from "discord.js";

export default class TicketEnable extends Command {
  constructor() {
    super("ticket-enable", {
      description: (language: Language) =>
        language.get("TICKET_ENABLE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      restrictTo: "guild",
      args: [
        {
          id: "category",
          type: "categorySilent",
          readableType: "category",
          description: (language: Language) =>
            language.get("TICKET_ENABLE_CATEGORY_ARGUMENT_DESCRIPTION"),
          required: false,
          default: null,
        },
        {
          id: "channel",
          type: "textChannelSilent",
          readableType: "channel",
          description: (language: Language) =>
            language.get("TICKET_ENABLE_CHANNEL_ARGUMENT_DESCRIPTION"),
          required: false,
          default: null,
        },
      ],
      aliases: ["tickets-enable"],
      parent: "ticket",
    });
  }

  async exec(
    message: FireMessage,
    args: { category?: CategoryChannel; channel?: FireTextChannel }
  ) {
    if (!args.category && !args.channel) {
      message.guild.settings.delete("tickets.parent");
      return await message.success("TICKETS_DISABLED");
    } else if (args.category && !args.channel) {
      if (
        message.guild.settings.get<Snowflake[]>("tickets.parent", []).length > 1
      )
        return await message.error("TICKET_ENABLE_OVERFLOW_EXISTS");
      message.guild.settings.set<Snowflake[]>("tickets.parent", [
        args.category.id,
      ]);
      return await message.success("TICKETS_ENABLED_CATEGORY", {
        category: args.category.name.toUpperCase(),
      });
    } else if (args.channel && !args.category) {
      if (!message.guild.hasExperiment(1651882237, 1))
        return await message.error("TICKET_ENABLE_THREADS_UNAVAILABLE");
      else if (args.channel.type != "GUILD_TEXT")
        return await message.error("TICKET_ENABLE_CHANNEL_INVALID");

      message.guild.settings.set<Snowflake[]>("tickets.parent", [
        args.channel.id,
      ]);
      return await message.success("TICKETS_ENABLED_CHANNEL", {
        channel: args.channel.toString(),
      });
    }
  }
}
