import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import Tickets from "./tickets";

export default class TicketHelp extends Command {
  constructor() {
    super("ticket-help", {
      description: (language: Language) =>
        language.get("TICKET_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      restrictTo: "guild",
      aliases: ["tickets-help"],
      parent: "ticket",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const parent = this.client.getCommand("ticket") as Tickets;
    return await parent.sendDefaultMessage(command);
  }
}
