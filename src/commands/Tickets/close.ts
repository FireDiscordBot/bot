import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { TextChannel } from "discord.js";

export default class CloseTicket extends Command {
  constructor() {
    super("close", {
      description: (language: Language) =>
        language.get("CLOSE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_CHANNELS", "MANAGE_ROLES"],
      args: [
        {
          id: "reason",
          type: "string",
          default: "No reason provided.",
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      aliases: ["closeticket"],
      lock: "channel",
    });
  }

  async exec(message: FireMessage, args: { reason: string }) {
    if (!message.member) return; // how
    await message.error("TICKET_WILL_CLOSE");
    const willClose = await message.channel
      .awaitMessages(
        (m: FireMessage) =>
          m.content.toLowerCase().trim() == "close" &&
          m.author.id == message.author.id,
        { max: 1, time: 10000, errors: ["time"] }
      )
      .catch(() => {});
    if (!willClose) return await message.error();
    const closure = await message.guild.closeTicket(
      message.channel as TextChannel,
      message.member,
      args.reason
    );
    if (closure == "forbidden")
      return await message.error("TICKET_CLOSE_FORBIDDEN");
    else if (closure == "nonticket")
      return await message.error("TICKET_NON_TICKET");
    else if (closure instanceof Error)
      return this.client.commandHandler.emit(
        "commandError",
        message,
        this,
        args,
        closure
      );
    return await message.success();
  }
}
