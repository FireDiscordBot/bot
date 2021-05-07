import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TicketDescription extends Command {
  constructor() {
    super("ticket-description", {
      description: (language: Language) =>
        language.get("TICKET_DESCRIPTION_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      restrictTo: "guild",
      args: [
        {
          id: "description",
          required: false,
          type: "string",
          default: null,
        },
      ],
      aliases: ["tickets-description"],
      parent: "ticket",
    });
  }

  async exec(message: FireMessage, args: { description?: string }) {
    if (!args.description) {
      message.guild.settings.delete("tickets.description");
      return await message.success("TICKET_DESCRIPTION_RESET");
    } else {
      message.guild.settings.set("tickets.description", args.description);
      await message.success("TICKET_DESCRIPTION_SET");
      const embed = new MessageEmbed()
        .setTitle(
          message.guild.language.get(
            "TICKET_OPENER_TILE",
            message.member?.toString()
          )
        )
        .setDescription(args.description)
        .setTimestamp()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .addField(
          message.guild.language.get("SUBJECT"),
          message.guild.language.get("TICKET_DESCRIPTION_EXAMPLE_SUBJECT")
        );
      return await message.channel.send(embed);
    }
  }
}
