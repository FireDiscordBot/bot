import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { FireMember } from "../../../lib/extensions/guildmember";
import { TextChannel } from "discord.js";

export default class TicketRemove extends Command {
  constructor() {
    super("ticketremove", {
      description: (language: Language) =>
        language.get("TICKETREMOVE_COMMAND_DESCRIPTION"),
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
      restrictTo: "guild",
      aliases: ["remove"],
    });
  }

  async exec(message: FireMessage, args: { user: FireMember }) {
    if (!args.user) return await message.error("TICKET_REMOVE_NOBODY");
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
      return await message.error("TICKET_REMOVE_FORBIDDEN");
    if (channel.topic.includes(args.user.id))
      return await message.error("TICKET_REMOVE_AUTHOR");
    if (!args.user.permissionsIn(channel).has("VIEW_CHANNEL"))
      return await message.error("TICKET_REMOVE_NOT_FOUND");
    const updated = await channel
      .updateOverwrite(
        args.user,
        {
          VIEW_CHANNEL: false,
          SEND_MESSAGES: false,
        },
        message.language.get(
          "TICKET_REMOVE_REASON",
          message.author.toString(),
          message.author.id
        ) as string
      )
      .catch(() => {});
    return updated ? await message.success() : await message.error();
  }
}
