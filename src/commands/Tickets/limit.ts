import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class TicketLimit extends Command {
  constructor() {
    super("ticket-limit", {
      description: (language: Language) =>
        language.get("TICKET_LIMIT_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
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
    await message.guild.settings.set<number>("tickets.limit", limit);
    return await message.success("TICKET_LIMIT_UPDATED", { limit });
  }
}
