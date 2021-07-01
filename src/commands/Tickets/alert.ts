import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions, Role } from "discord.js";

export default class TicketAlert extends Command {
  constructor() {
    super("ticket-alert", {
      description: (language: Language) =>
        language.get("TICKET_ALERT_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
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
    if (typeof args.alert == "undefined") {
      message.guild.settings.delete("tickets.alert");
      return await message.success("TICKET_ALERT_RESET");
    } else if (!args.alert) return;
    else {
      message.guild.settings.set<string>("tickets.alert", args.alert.id);
      await message.success("TICKET_ALERT_SET", {
        role: args.alert.toString(),
      });
    }
  }
}
