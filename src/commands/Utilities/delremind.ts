import {
  MessageActionRow,
  MessageButton,
  SnowflakeUtil,
  Snowflake,
} from "discord.js";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Reminder } from "@fire/lib/interfaces/reminders";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

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
      slashOnly: true,
    });
  }

  // TODO: add autocomplete (waiting for official support to do personalised ones)

  async run(command: ApplicationCommandMessage, args: { index?: number }) {
    if (!args.index) return await command.error("DELREMIND_MISSING_ARG");
    const remindersResult = await this.client.db.query(
      "SELECT * FROM remind WHERE uid=$1",
      [command.author.id]
    );
    if (!remindersResult.rows.length)
      return await command.error("REMINDERS_NONE_FOUND");
    let timestamps: number[] = [],
      reminders: (Reminder & { date: Date })[] = [];
    for await (const reminder of remindersResult) {
      const date = reminder.get("forwhen") as Date;
      timestamps.push(+date);
      reminders.push({
        user: reminder.get("uid") as Snowflake,
        text: reminder.get("reminder") as string,
        link: reminder.get("link") as string,
        timestamp: +date,
        date,
      });
    }
    if (timestamps.length < args.index)
      return await command.error("DELREMIND_TOO_HIGH");
    const timestamp = timestamps[args.index - 1];
    const reminder = reminders[args.index - 1];
    const yesSnowflake = SnowflakeUtil.generate();
    this.client.buttonHandlersOnce.set(yesSnowflake, this.yesButton(timestamp));
    const noSnowflake = SnowflakeUtil.generate();
    this.client.buttonHandlersOnce.set(noSnowflake, this.noButton);
    return await command.send("DELREMIND_CONFIRM", {
      text: reminder.text,
      date: reminder.date.toLocaleString(command.language.id),
      components: [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("SUCCESS")
            .setCustomId(`!${yesSnowflake}`)
            .setLabel(command.language.get("DELREMIND_DELETE_IT")),
          new MessageButton()
            .setStyle("DANGER")
            .setCustomId(`!${noSnowflake}`)
            .setLabel(command.language.get("DELREMIND_CANCEL")),
        ]),
      ],
    });
  }

  private yesButton(timestamp: number) {
    return async (button: ComponentMessage) => {
      const deleted = await button.author.deleteReminder(timestamp);
      return deleted
        ? await button.channel.update({
            content: button.language.getSuccess("DELREMIND_YES"),
            components: [],
          })
        : await button.channel.update({
            content: button.language.getError("ERROR_CONTACT_SUPPORT"),
            components: [],
          });
    };
  }

  private async noButton(button: ComponentMessage) {
    return await button.channel.update({
      content: button.language.get("DELREMIND_NO"),
      components: [],
    });
  }
}
