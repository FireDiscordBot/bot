import { FireMessage } from "@fire/lib/extensions/message";
import { CategoryChannel, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TicketCategory extends Command {
  constructor() {
    super("ticket-category", {
      description: (language: Language) =>
        language.get("TICKET_CATEGORY_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
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
      message.guild.settings.set<string>("tickets.parent", args.category.id);
      return await message.success("TICKETS_ENABLED", args.category.name);
    }
  }
}
