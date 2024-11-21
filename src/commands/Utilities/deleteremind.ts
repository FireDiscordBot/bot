import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  MessageActionRow,
  MessageButton,
  SnowflakeUtil,
} from "discord.js";

export default class RemindersDelete extends Command {
  constructor() {
    super("reminders-delete", {
      description: (language: Language) =>
        language.get("REMINDERS_DELETE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "reminder",
          type: "string",
          description: (language: Language) =>
            language.get("REMINDERS_DELETE_ARG_DESCRIPTION"),
          required: true,
          autocomplete: true,
          default: null,
        },
      ],
      parent: "reminders",
      restrictTo: "all",
      ephemeral: true,
      slashOnly: true,
    });
  }

  async autocomplete(
    interaction: ApplicationCommandMessage,
    focused: CommandInteractionOption
  ) {
    const remindersResult = await this.client.db.query(
      "SELECT * FROM remind WHERE uid=$1 LIMIT 25;",
      [interaction.author.id]
    );
    if (!remindersResult.rows.length) return [];
    const reminders: ApplicationCommandOptionChoiceData[] = [];
    let timestamps = [];
    for await (const reminder of remindersResult) {
      const ts = +(reminder.get("forwhen") as Date);
      let reminderText = reminder.get("reminder") as string;
      if (reminderText.length > 97)
        reminderText = reminderText.substring(0, 97) + "...";
      timestamps.push(ts);
      reminders.push({
        name: `${reminderText}`,
        value: ts.toString(),
      });
    }
    timestamps = timestamps.sort().map((ts) => ts.toString());
    return reminders
      .sort((a, b) => timestamps.indexOf(a.value) - timestamps.indexOf(b.value))
      .filter((reminder) =>
        reminder.name
          .toLowerCase()
          .includes(focused.value?.toString().toLowerCase())
      );
  }

  async run(command: ApplicationCommandMessage, args: { reminder?: string }) {
    const timestamp = +args.reminder;
    if (!args.reminder)
      return await command.error("REMINDERS_DELETE_MISSING_ARG");
    const remindersResult = await this.client.db
      .query("SELECT * FROM remind WHERE uid=$1 AND forwhen=$2 LIMIT 1;", [
        command.author.id,
        new Date(timestamp),
      ])
      .first()
      .catch(() => {});
    if (!remindersResult)
      return await command.error("REMINDERS_LIST_NONE_FOUND");
    const date = remindersResult.get("forwhen") as Date;
    const reminder = {
      user: remindersResult.get("uid") as Snowflake,
      text: remindersResult.get("reminder") as string,
      link: remindersResult.get("link") as string,
      timestamp: +date,
      date,
    };
    const yesSnowflake = SnowflakeUtil.generate();
    this.client.buttonHandlersOnce.set(
      yesSnowflake,
      this.yesButton(reminder.timestamp, reminder.link)
    );
    const noSnowflake = SnowflakeUtil.generate();
    this.client.buttonHandlersOnce.set(noSnowflake, this.noButton);
    return await command.send("REMINDERS_DELETE_CONFIRM", {
      text: reminder.text,
      date: reminder.date.toLocaleString(command.language.id),
      components: [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("SUCCESS")
            .setCustomId(`!${yesSnowflake}`)
            .setLabel(command.language.get("REMINDERS_DELETE_DELETE_IT")),
          new MessageButton()
            .setStyle("DANGER")
            .setCustomId(`!${noSnowflake}`)
            .setLabel(command.language.get("REMINDERS_DELETE_CANCEL")),
        ]),
      ],
    });
  }

  private yesButton(timestamp: number, link: string) {
    return async (button: ComponentMessage) => {
      const deleted = await button.author.deleteReminder(timestamp, link);
      return deleted
        ? await button.channel.update({
            content: button.language.getSuccess("REMINDERS_DELETE_YES"),
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
      content: button.language.get("REMINDERS_DELETE_NO"),
      components: [],
    });
  }
}
