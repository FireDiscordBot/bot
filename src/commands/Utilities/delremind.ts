import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Reminder } from "@fire/lib/interfaces/reminders";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Snowflake } from "discord.js";

export default class DeleteReminder extends Command {
  constructor() {
    super("delremind", {
      description: (language: Language) =>
        language.get("DELREMIND_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "index",
          type: "number",
          description: (language: Language) =>
            language.get("DELREMIND_ARG_DESCRIPTION"),
          required: true,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      ephemeral: true,
    });
  }

  async exec(message: FireMessage, args: { index?: number }) {
    if (!args.index) return await message.error("DELREMIND_MISSING_ARG");
    const remindersResult = await this.client.db.query(
      "SELECT * FROM remind WHERE uid=$1",
      [message.author.id]
    );
    if (!remindersResult.rows.length)
      return await message.error("REMINDERS_NONE_FOUND");
    let timestamps: number[] = [],
      reminders: (Reminder & { date: Date })[] = [];
    for await (const reminder of remindersResult) {
      const legacy = (reminder.get("legacy") as boolean) || false;
      const timestamp = legacy
        ? parseFloat(reminder.get("forwhen") as string)
        : parseInt(reminder.get("forwhen") as string);
      timestamps.push(timestamp);
      reminders.push({
        user: reminder.get("uid") as Snowflake,
        text: reminder.get("reminder") as string,
        link: reminder.get("link") as string,
        legacy,
        timestamp,
        date: new Date(timestamp),
      });
    }
    if (timestamps.length < args.index)
      return await message.error("DELREMIND_TOO_HIGH");
    const timestamp = timestamps[args.index - 1];
    const reminder = reminders[args.index - 1];
    const confirmation = await message.send("DELREMIND_CONFIRM", reminder);
    const yesOrNo = await message.channel
      .awaitMessages(
        (msg: FireMessage) =>
          msg.author.id == message.author.id &&
          (message instanceof SlashCommandMessage
            ? msg.channel.id == message.realChannel.id
            : msg.channel.id == message.channel.id),
        { max: 1, time: 10000, errors: ["time"] }
      )
      .catch(() => {});
    if (yesOrNo)
      await yesOrNo
        .first()
        ?.delete()
        .catch(() => {});
    await confirmation.delete().catch(() => {});
    if (!yesOrNo || !yesOrNo.first()?.content.toLowerCase().includes("yes"))
      return await message.send(
        typeof yesOrNo == "undefined" ? "DELREMIND_TIME" : "DELREMIND_NO"
      );
    const deleted = await message.author.deleteReminder(timestamp);
    return deleted
      ? await message.success("DELREMIND_YES")
      : await message.error();
  }
}
