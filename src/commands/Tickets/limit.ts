import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class TicketLimit extends Command {
  constructor() {
    super("ticket-limit", {
      description: (language: Language) =>
        language.get("TICKET_LIMIT_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
    if (!message.guild.areTicketsEnabled())
      return await message.error("TICKETS_DISABLED_ACTION_BLOCKED");

    const limit = args.limit;
    if (!limit || limit > 5 || limit < 0)
      return await message.error("TICKETS_INVALID_LIMIT");
    await message.guild.settings.set<number>(
      "tickets.limit",
      limit,
      message.author
    );
    return await message.success("TICKET_LIMIT_UPDATED", { limit });
  }
}
