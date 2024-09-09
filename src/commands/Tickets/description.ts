import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";

export default class TicketDescription extends Command {
  constructor() {
    super("ticket-description", {
      description: (language: Language) =>
        language.get("TICKET_DESCRIPTION_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
      restrictTo: "guild",
      args: [
        {
          id: "description",
          description: (language: Language) =>
            language.get("TICKET_DESCRIPTION_ARGUMENT_DESCRIPTION"),
          required: false,
          type: "string",
          default: null,
        },
      ],
      parent: "ticket",
    });
  }

  async exec(message: FireMessage, args: { description?: string }) {
    if (!message.guild.areTicketsEnabled())
      return await message.error("TICKETS_DISABLED_ACTION_BLOCKED");

    if (!args.description) {
      message.guild.settings.delete("tickets.description");
      return await message.success("TICKET_DESCRIPTION_RESET");
    } else {
      message.guild.settings.set<string>(
        "tickets.description",
        args.description
      );
      await message.success("TICKET_DESCRIPTION_SET");
      const embed = new MessageEmbed()
        .setTitle(
          message.guild.language.get("TICKET_OPENER_TILE", {
            author: message.author.toString(),
          })
        )
        .setDescription(args.description)
        .setTimestamp()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .addField(
          message.guild.language.get("SUBJECT"),
          message.guild.language.get("TICKET_DESCRIPTION_EXAMPLE_SUBJECT")
        );
      return await message.channel.send({ embeds: [embed] });
    }
  }
}
