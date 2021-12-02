import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Tickets extends Command {
  constructor() {
    super("ticket", {
      description: (language: Language) =>
        language.get("TICKET_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      restrictTo: "guild",
      args: [
        {
          id: "action",
          type: "string",
          match: "phrase",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      aliases: ["tickets"],
      group: true,
    });
  }

  async exec(message: FireMessage, args: { action?: string }) {
    if (this.getChildren().includes(`ticket-${args.action}`)) {
      message.content = message.content.replace(
        `${message.util?.parsed?.alias || "ticket"} ${args.action}`,
        `ticket-${args.action}`
      );
      return await this.client.commandHandler.handle(message);
    } else return await this.sendDefaultMessage(message);
  }

  async sendDefaultMessage(message: FireMessage) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setTimestamp()
      .setDescription(message.language.get("TICKET_MAIN_DESCRIPTION"))
      .setAuthor({
        name: message.author.toString(),
        iconURL: message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(
        `${message.util.parsed?.prefix}ticket category [<category>]`,
        message.language.get("TICKET_CATEGORY_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket limit <number>`,
        message.language.get("TICKET_LIMIT_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket name [<name>]`,
        message.language.get("TICKET_NAME_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket description [<description>]`,
        message.language.get("TICKET_DESCRIPTION_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket alert [<role>]`,
        message.language.get("TICKET_ALERT_DESCRIPTION")
      )
      .addField(
        `${message.util.parsed?.prefix}ticket list`,
        message.language.get("TICKET_LIST_DESCRIPTION")
      );
    return await message.channel.send({ embeds: [embed] });
  }
}
