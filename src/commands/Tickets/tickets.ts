import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";

export default class Tickets extends Command {
  constructor() {
    super("ticket", {
      description: (language: Language) =>
        language.get("TICKET_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      userPermissions: [PermissionFlagsBits.ManageGuild],
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

  async sendDefaultMessage(message: FireMessage | ApplicationCommandMessage) {
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
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
      .addFields([
        {
          name: `${message.util.parsed?.prefix}ticket enable [<category> <channel>]`,
          value: message.language.get("TICKET_ENABLE_DESCRIPTION"),
        },
        {
          name: `${message.util.parsed?.prefix}ticket toggle`,
          value: message.language.get("TICKET_TOGGLE_DESCRIPTION"),
        },
        {
          name: `${message.util.parsed?.prefix}ticket limit <number>`,
          value: message.language.get("TICKET_LIMIT_DESCRIPTION"),
        },

        {
          name: `${message.util.parsed?.prefix}ticket name [<name>]`,
          value: message.language.get("TICKET_NAME_DESCRIPTION"),
        },
        {
          name: `${message.util.parsed?.prefix}ticket description [<description>]`,
          value: message.language.get("TICKET_DESCRIPTION_DESCRIPTION"),
        },
        {
          name: `${message.util.parsed?.prefix}ticket alert [<role>]`,
          value: message.language.get("TICKET_ALERT_DESCRIPTION"),
        },
        {
          name: `${message.util.parsed?.prefix}ticket invitable`,
          value: message.language.get("TICKET_INVITABLE_DESCRIPTION"),
        },
        {
          name: `${message.util.parsed?.prefix}ticket list`,
          value: message.language.get("TICKET_LIST_DESCRIPTION"),
        },
      ]);
    return await message.channel.send({ embeds: [embed] });
  }
}
