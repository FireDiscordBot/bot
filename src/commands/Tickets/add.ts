import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class TicketAdd extends Command {
  constructor() {
    super("add", {
      description: (language: Language) =>
        language.get("TICKET_ADD_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageRoles,
      ],
      args: [
        {
          id: "user",
          type: "memberSilent",
          readableType: "member",
          default: null,
          required: true,
        },
      ],
      enableSlashCommand: true,
      aliases: ["ticketadd"],
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { user: FireMember }) {
    if (!message.guild.areTicketsEnabled())
      return await message.error("TICKETS_DISABLED_ACTION_BLOCKED");

    if (!args.user) return await message.error("TICKET_ADD_NOBODY");
    const channel = message.channel as FireTextChannel;
    const channels = message.guild.settings.get<string[]>(
      "tickets.channels",
      []
    );
    if (!channels.includes(channel.id))
      return await message.error("TICKET_NON_TICKET");
    if (
      // TODO: below doesn't work with ticket threads
      !channel.topic?.includes(message.author.id) &&
      !message.member.permissions.has(PermissionFlagsBits.ManageChannels)
    )
      return await message.error("TICKET_ADD_FORBIDDEN");
    const updated = await channel.permissionOverwrites
      .edit(
        args.user,
        {
          VIEW_CHANNEL: true,
          SEND_MESSAGES: true,
        },
        {
          reason: message.language.get("TICKET_ADD_REASON", {
            author: message.author.toString(),
            id: message.author.id,
          }) as string,
          type: 1,
        }
      )
      .catch(() => {});
    return updated
      ? await message.success("TICKET_ADD_SUCCESS", {
          user: args.user.toString(),
        })
      : await message.error("TICKET_ADD_FAILURE", {
          user: args.user.toString(),
        });
  }
}
