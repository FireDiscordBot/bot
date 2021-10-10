import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Formatters, MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Reminders extends Command {
  constructor() {
    super("reminders", {
      description: (language: Language) =>
        language.get("REMINDERS_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      aliases: ["listremind", "listreminders"],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const remindersResult = await this.client.db.query(
      "SELECT * FROM remind WHERE uid=$1",
      [command.author.id]
    );
    if (!remindersResult.rows.length)
      return await command.error("REMINDERS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 1980);
    let index = 1;
    for await (const reminder of remindersResult) {
      const forwhen = reminder.get("forwhen") as Date;
      paginator.addLine(
        `[${index++}] ${reminder.get("reminder")} - ${Formatters.time(
          forwhen,
          "R"
        )}`
      );
    }
    const embed = new MessageEmbed().setColor(command.member?.displayColor);
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      {
        owner: command.member || command.author,
        embed,
        footer: {
          text: command.language.get("REMINDERS_FOOTER", {
            prefix: command.util?.parsed?.prefix,
          }),
        },
      }
    );
    return await paginatorInterface.send(command.channel);
  }
}
