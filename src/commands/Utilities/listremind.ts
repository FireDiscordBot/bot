import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import {
  PaginatorEmbedInterface,
  WrappedPaginator
} from "@fire/lib/util/paginators";
import { Formatters, MessageEmbed } from "discord.js";

export default class RemindersList extends Command {
  constructor() {
    super("reminders-list", {
      description: (language: Language) =>
        language.get("REMINDERS_LIST_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      parent: "reminders",
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
      return await command.error("REMINDERS_LIST_NONE_FOUND");
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
          text: command.language.get("REMINDERS_LIST_FOOTER"),
        },
      }
    );
    return await paginatorInterface.send(command.channel);
  }
}
