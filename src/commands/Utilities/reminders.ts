import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "../../../lib/util/paginators";
import { FireMessage } from "../../../lib/extensions/message";
import { humanize } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import * as moment from "moment";

export default class Reminders extends Command {
  constructor() {
    super("reminders", {
      description: (language: Language) =>
        language.get("REMINDERS_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      aliases: ["listremind", "listreminders"],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage) {
    const remindersResult = await this.client.db.query(
      "SELECT * FROM remind WHERE uid=$1",
      [message.author.id]
    );
    if (!remindersResult.rows.length)
      return await message.error("REMINDERS_NONE_FOUND");
    const paginator = new WrappedPaginator("", "", 1980);
    let index = 1;
    for await (const reminder of remindersResult) {
      const legacy = (reminder.get("legacy") as boolean) || false;
      const forwhen = new Date(
        legacy
          ? parseFloat(reminder.get("forwhen") as string)
          : parseInt(reminder.get("forwhen") as string)
      );
      const delta = humanize(
        moment().diff(forwhen),
        message.language.id.split("-")[0]
      );
      paginator.addLine(
        `[${index++}] ${reminder.get("reminder")} - ${forwhen.toLocaleString(
          message.language.id
        )} (${delta})`
      );
    }
    const embed = new MessageEmbed().setColor(
      message.member?.displayColor || "#ffffff"
    );
    const paginatorInterface = new PaginatorEmbedInterface(
      this.client,
      paginator,
      {
        owner: message?.member || message.author,
        embed,
      }
    );
    return await paginatorInterface.send(message.channel);
  }
}
