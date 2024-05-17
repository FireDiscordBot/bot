import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class TicketRemove extends Command {
  constructor() {
    super("remove", {
      description: (language: Language) =>
        language.get("TICKET_REMOVE_COMMAND_DESCRIPTION"),
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
      aliases: ["ticketremove"],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage, args: { user: FireMember }) {
    if (!args.user) return await message.error("TICKET_REMOVE_NOBODY");
    const channel = message.channel as FireTextChannel;
    const channels = message.guild.settings.get<string[]>(
      "tickets.channels",
      []
    );
    if (!channels.includes(channel.id))
      return await message.error("TICKET_NON_TICKET");
    if (
      !channel.topic.includes(message.author.id) &&
      !message.member.permissions.has(PermissionFlagsBits.ManageChannels)
    )
      return await message.error("TICKET_REMOVE_FORBIDDEN");
    if (channel.topic.includes(args.user.id))
      return await message.error("TICKET_REMOVE_AUTHOR");
    if (!args.user.permissionsIn(channel).has(PermissionFlagsBits.ViewChannel))
      return await message.error("TICKET_REMOVE_NOT_FOUND");
    const updated = await channel.permissionOverwrites
      .edit(
        args.user,
        {
          VIEW_CHANNEL: false,
          SEND_MESSAGES: false,
        },
        {
          reason: message.language.get("TICKET_REMOVE_REASON", {
            author: message.author.toString(),
            id: message.author.id,
          }) as string,
          type: 1,
        }
      )
      .catch(() => {});
    return updated
      ? await message.success("TICKET_REMOVE_SUCCESS", {
          user: args.user.toString(),
        })
      : await message.error("TICKET_REMOVE_FAILURE", {
          user: args.user.toString(),
        });
  }
}
