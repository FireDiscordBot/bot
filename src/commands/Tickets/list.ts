import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { getIDMatch } from "@fire/lib/util/converters";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class TicketList extends Command {
  constructor() {
    super("ticket-list", {
      description: (language: Language) =>
        language.get("TICKET_LIST_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      aliases: ["tickets-list"],
      restrictTo: "guild",
      parent: "ticket",
    });
  }

  async exec(message: FireMessage) {
    const guild = message.guild;
    const tickets = guild.tickets.filter(
      (ticket) => ticket.type == "GUILD_TEXT" || !ticket.archived
    ); // we only want open tickets
    if (!tickets.length) return await message.error("TICKET_LIST_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 1024);
    for (const ticket of tickets) {
      const authorId = getIDMatch(
        ticket instanceof FireTextChannel ? ticket.topic : ticket.name,
        true
      );
      let author: FireMember;
      if (authorId)
        author = (await guild.members
          .fetch(authorId)
          .catch(() => {})) as FireMember;
      paginator.addLine(
        guild.language.get(
          authorId
            ? "TICKET_CHANNEL_TOPIC_WITH_CHANNEL"
            : "TICKET_CHANNEL_TOPIC_WITH_CHANNEL_NO_ID",
          {
            ticket: ticket.toString(),
            author: author
              ? author.toMention()
              : guild.language.get("TICKET_AUTHOR_UNKNOWN"),
            id: authorId,
          }
        )
      );
    }
    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setTimestamp();
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      { owner: message.member, embed }
    );
    return await paginatorInterface.send(message.channel);
  }
}
