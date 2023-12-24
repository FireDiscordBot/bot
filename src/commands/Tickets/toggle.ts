import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions, Role } from "discord.js";

export default class TicketToggle extends Command {
  constructor() {
    super("ticket-toggle", {
      description: (language: Language) =>
        language.get("TICKET_TOGGLE_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      restrictTo: "guild",
      args: [
        {
          id: "message",
          type: "string",
          match: "rest",
          required: false,
          default: undefined,
        },
      ],
      aliases: ["tickets-toggle"],
      parent: "ticket",
    });
  }

  async exec(message: FireMessage, args: { message: string }) {
    if (!message.guild.settings.has("tickets.parent"))
      return await message.error("TICKET_TOGGLE_NOT_ENABLED");
    const current = message.guild.settings.get<string>("tickets.togglemsg");
    if (!args.message && !current)
      return await message.error("TICKET_TOGGLE_NO_MESSAGE");
    else if (!args.message) {
      await message.guild.settings.delete("tickets.togglemsg");
      return await message.success("TICKET_TOGGLE_ON");
    } else {
      await message.guild.settings.set("tickets.togglemsg", args.message);
      return await message.success("TICKET_TOGGLE_OFF", {
        message: args.message,
      });
    }
  }
}
