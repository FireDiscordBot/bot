import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Role } from "discord.js";

export default class TicketAlert extends Command {
  constructor() {
    super("ticket-alert", {
      description: (language: Language) =>
        language.get("TICKET_ALERT_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      restrictTo: "guild",
      args: [
        {
          id: "alert",
          type: "role",
          required: false,
          default: undefined,
        },
      ],
      aliases: ["tickets-alert"],
      parent: "ticket",
    });
  }

  async exec(message: FireMessage, args: { alert?: Role }) {
    if (!message.guild.areTicketsEnabled())
      return await message.error("TICKETS_DISABLED_ACTION_BLOCKED");

    if (typeof args.alert == "undefined") {
      await message.guild.settings.delete("tickets.alert", message.author);
      return await message.success("TICKET_ALERT_RESET");
    } else if (!args.alert) return;
    else {
      await message.guild.settings.set<string>(
        "tickets.alert",
        args.alert.id,
        message.author
      );
      await message.success("TICKET_ALERT_SET", {
        role: args.alert.toString(),
      });
    }
  }
}
