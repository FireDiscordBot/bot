import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";

export default class CloseTicket extends Command {
  constructor() {
    super("closeticket", {
      description: (language: Language) =>
        language.get("CLOSE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_CHANNELS", "MANAGE_ROLES"],
      args: [
        {
          id: "reason",
          type: "string",
          default: "No reason provided.",
          required: false,
        },
      ],
      restrictTo: "guild",
      aliases: ["close"],
    });
  }

  async exec(message: FireMessage, args: { reason: string }) {
    if (!message.member) return; // how
    const closure = await message.guild.closeTicket(
      message.channel as TextChannel,
      message.member,
      args.reason
    );
    if (closure == "forbidden")
      return await message.error("TICKET_CLOSE_FORBIDDEN");
    else if (closure == "nonticket")
      return await message.error("TICKET_NON_TICKET");
    return await message.success();
  }
}
