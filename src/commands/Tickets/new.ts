import { FireMessage } from "../../../lib/extensions/message";
import { constants } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";
import { SlashCommandMessage } from "../../../lib/extensions/slashCommandMessage";

export default class NewTicket extends Command {
  constructor() {
    super("new", {
      description: (language: Language) =>
        language.get("NEW_COMMAND_DESCRIPTION"),
      clientPermissions: [
        "SEND_MESSAGES",
        "EMBED_LINKS",
        "MANAGE_CHANNELS",
        "MANAGE_ROLES",
      ],
      restrictTo: "guild",
      args: [
        {
          id: "subject",
          type: "string",
          default: "No subject given",
          required: false,
        },
      ],
      enableSlashCommand: true,
      aliases: ["newticket"],
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { subject: string }) {
    if (!message.member) return; // how
    const creating = await message.send("NEW_TICKET_CREATING");
    const ticket = await message.guild.createTicket(
      message.member,
      args.subject
    );
    if (ticket == "author") return;
    // how?
    else if (ticket == "disabled")
      return await message.error("NEW_TICKET_DISABLED");
    else if (ticket == "limit") return await message.error("NEW_TICKET_LIMIT");
    else if (ticket instanceof TextChannel)
      return await creating.edit(
        `${constants.emojis.success} ${message.language.get(
          "NEW_TICKET_CREATED",
          ticket.toString()
        )}`
      );
  }
}
