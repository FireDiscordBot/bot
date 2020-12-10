import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { FireMember } from "../../../lib/extensions/guildmember";
import { TextChannel } from "discord.js";

export default class TicketAdd extends Command {
  constructor() {
    super("ticketadd", {
      description: (language: Language) =>
        language.get("TICKETADD_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_ROLES"],
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
      restrictTo: "guild",
      aliases: ["add"],
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { user: FireMember }) {
    if (!args.user) return await message.error("TICKET_ADD_NOBODY");
    const channel = message.channel as TextChannel;
    const channels = message.guild.settings.get(
      "tickets.channels",
      []
    ) as string[];
    if (!channels.includes(channel.id))
      return await message.error("TICKET_NON_TICKET");
    if (
      !channel.topic.includes(message.author.id) &&
      !message.member.permissions.has("MANAGE_CHANNELS")
    )
      return await message.error("TICKET_ADD_FORBIDDEN");
    const updated = await channel
      .updateOverwrite(
        args.user,
        {
          VIEW_CHANNEL: true,
          SEND_MESSAGES: true,
        },
        message.language.get(
          "TICKET_ADD_REASON",
          message.author.toString(),
          message.author.id
        ) as string
      )
      .catch(() => {});
    return updated ? await message.success() : await message.error();
  }
}
