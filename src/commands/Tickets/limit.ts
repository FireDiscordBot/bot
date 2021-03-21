import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TicketLimit extends Command {
  constructor() {
    super("ticket-limit", {
      description: (language: Language) =>
        language.get("TICKET_LIMIT_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "MANAGE_CHANNELS"],
      userPermissions: ["MANAGE_GUILD"],
      restrictTo: "guild",
      args: [
        {
          id: "limit",
          type: "number",
          required: false,
          default: null,
        },
      ],
      aliases: ["tickets-limit"],
      parent: "ticket",
    });
  }

  async exec(message: FireMessage, args: { limit?: number }) {
    const limit = args.limit;
    if (!limit || limit > 5 || limit < 0)
      return await message.error("TICKETS_INVALID_LIMIT");
    message.guild.settings.set("tickets.limit", limit);
    return await message.success();
  }
}
