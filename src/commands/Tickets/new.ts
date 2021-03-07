import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const { emojis } = constants;

export default class NewTicket extends Command {
  constructor() {
    super("new", {
      description: (language: Language) =>
        language.get("NEW_COMMAND_DESCRIPTION"),
      clientPermissions: [
        "SEND_MESSAGES",
        "EMBED_LINKS",
        "MANAGE_CHANNELS",
        "MANAGE_ROLES",
      ],
      restrictTo: "guild",
      args: [
        {
          id: "subject",
          type: "string",
          default: "No subject given",
          required: false,
        },
      ],
      enableSlashCommand: true,
      aliases: ["newticket"],
    });
  }

  async exec(message: FireMessage, args: { subject: string }) {
    if (!message.member) return; // how
    const creating = await message.send("NEW_TICKET_CREATING");
    const ticket = await message.guild
      .createTicket(message.member, args.subject)
      // return author as it'll just return
      .catch(() => "author");
    // how?
    if (ticket == "author") return;
    else if (ticket == "disabled")
      return await creating.edit(
        `${emojis.error} ${message.language.get("NEW_TICKET_DISABLED")}`
      );
    else if (ticket == "limit")
      return await creating.edit(
        `${emojis.error} ${message.language.get("NEW_TICKET_LIMIT")}`
      );
    else if (ticket == "lock")
      return await creating.edit(
        `${emojis.error} ${message.language.get(
          "NEW_TICKET_LOCK",
          message.guild.settings.get("tickets.limit", 1)
        )}`
      );
    else if (ticket instanceof Error)
      return this.client.commandHandler.emit(
        "commandError",
        message,
        this,
        args,
        ticket
      );
    else if (ticket instanceof FireTextChannel)
      return await creating.edit(
        `${emojis.success} ${message.language.get(
          "NEW_TICKET_CREATED",
          ticket.toString()
        )}`
      );
  }
}
