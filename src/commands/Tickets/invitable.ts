import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class TicketInvitable extends Command {
  constructor() {
    super("ticket-invitable", {
      description: (language: Language) =>
        language.get("TICKET_INVITABLE_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      restrictTo: "guild",
      aliases: ["tickets-invitable"],
      parent: "ticket",
      slashOnly: true,
      requiresExperiment: {
        id: 1651882237,
        bucket: 1,
      },
    });
  }

  async run(command: ApplicationCommandMessage) {
    if (!command.guild.areTicketsEnabled())
      return await command.error("TICKETS_DISABLED_ACTION_BLOCKED");

    const current = command.guild.settings.get<boolean>(
      "tickets.invitable",
      true
    );
    await command.guild.settings.set("tickets.invitable", !current);
    return await command.success(
      current ? "TICKET_INVITABLE_DISABLED" : "TICKET_INVITABLE_ENABLED"
    );
  }
}
