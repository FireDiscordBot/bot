import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class TicketAdd extends Command {
  constructor() {
    super("add", {
      description: (language: Language) =>
        language.get("TICKETADD_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.MANAGE_ROLES,
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
      !message.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)
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
    return updated ? await message.success() : await message.error();
  }
}
