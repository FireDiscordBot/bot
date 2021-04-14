import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { CategoryChannel } from "discord.js";

export default class TicketCategory extends Command {
  constructor() {
    super("ticket-category", {
      description: (language: Language) =>
        language.get("TICKET_CATEGORY_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "MANAGE_CHANNELS"],
      userPermissions: ["MANAGE_GUILD"],
      restrictTo: "guild",
      args: [
        {
          id: "category",
          type: "categorySilent",
          readableType: "category",
          required: false,
          default: null,
        },
      ],
      aliases: ["tickets-category"],
      parent: "ticket",
    });
  }

  async exec(message: FireMessage, args: { category?: CategoryChannel }) {
    if (!args.category) {
      message.guild.settings.delete("tickets.parent");
      return await message.success("TICKETS_DISABLED");
    } else {
      message.guild.settings.set("tickets.parent", args.category.id);
      return await message.success("TICKETS_ENABLED", args.category.name);
    }
  }
}
