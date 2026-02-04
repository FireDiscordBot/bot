import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteractionOption,
  Formatters,
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
    const focusedValue = focused.value?.toString();
    const remindersResult = await this.client.db.query<{
      forwhen: Date;
      reminder: string;
    }>(
      focusedValue
        ? "SELECT forwhen, reminder FROM remind WHERE uid=$1 AND reminder ILIKE $2 ORDER BY forwhen LIMIT 25;"
        : "SELECT forwhen, reminder FROM remind WHERE uid=$1 ORDER BY forwhen LIMIT 25;",
      focusedValue
        ? [interaction.author.id, `%${focusedValue}%`]
        : [interaction.author.id]
    );
    if (!remindersResult.rows.length) return [];
    const reminders: ApplicationCommandOptionChoiceData[] = [];
    for await (const reminder of remindersResult) {
      const forWhen = reminder.forwhen;
      const timestamp = +forWhen;
      const relativeTime = this.client.util.getRelativeTimeString(
        forWhen,
        interaction.language
      );
      let text = this.client.util.shortenText(
        this.client.util.stripMaskedLinks(reminder.reminder),
        100 - 3 - relativeTime.length
      );
      text += ` - ${relativeTime}`;
      reminders.push({
        name: text,
        value: timestamp.toString(),
      });
    }
    return reminders;
  }

  // we can't change the type for the command arg to include ComponentMessage
  // without errors so this dummy method is needed
  async run(command: ApplicationCommandMessage, args: { reminder?: string }) {
    return await this.actuallyRun(command, args);
  }

  async actuallyRun(
    command: ApplicationCommandMessage | ComponentMessage,
    args: { reminder?: string }
  ) {
    const timestamp = +args.reminder;
    if (!args.reminder)
      return await command.error("REMINDERS_DELETE_MISSING_ARG");
    const remindersResult = await this.client.db
      .query<{
        forwhen: Date;
        uid: Snowflake;
        reminder: string;
        link: string;
      }>(
        "SELECT forwhen, uid, reminder, link FROM remind WHERE uid=$1 AND forwhen=$2 LIMIT 1;",
        [command.author.id, new Date(timestamp)]
      )
      .first()
      .catch(() => {});
    if (!remindersResult)
      return await command.error("REMINDERS_LIST_NONE_FOUND");
    const date = remindersResult.forwhen;
    const reminder = {
      user: remindersResult.uid,
      text: remindersResult.reminder,
      link: remindersResult.link,
      timestamp: +date,
      date,
    };
    const yesSnowflake = SnowflakeUtil.generate();
    this.client.buttonHandlersOnce.set(
      yesSnowflake,
      this.yesButton(reminder.timestamp)
    );
    const emptyConfirmMessage = command.language.get(
      "REMINDERS_DELETE_CONFIRM",
      {
        text: "",
        date: Formatters.time(reminder.date, "R"),
      }
    );
    return await command.send("REMINDERS_DELETE_CONFIRM", {
      text: this.client.util.shortenText(
        this.client.util.supressLinks(reminder.text),
        2000 - emptyConfirmMessage.length
      ),
      date: Formatters.time(reminder.date, "R"),
      components: [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("SUCCESS")
            .setCustomId(`!${yesSnowflake}`)
            .setLabel(command.language.get("REMINDERS_DELETE_DELETE_IT")),
          new MessageButton()
            .setStyle("DANGER")
            .setCustomId("!reminders_delete_cancel")
            .setLabel(command.language.get("REMINDERS_DELETE_CANCEL")),
        ]),
      ],
    });
  }

  private yesButton(timestamp: number) {
    return async (button: ComponentMessage) => {
      const deleted = await button.author.deleteReminder(timestamp);
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
}
