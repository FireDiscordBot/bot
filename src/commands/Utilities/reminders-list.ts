import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";

export default class RemindersList extends Command {
  constructor() {
    super("reminders-list", {
      description: (language: Language) =>
        language.get("REMINDERS_LIST_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      parent: "reminders",
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const components = await this.getReminderListComponents(command, 0);
    if (!components || !("dropdown" in components)) return;
    const { dropdown, previousPageButton, nextPageButton } = components;

    return await command.channel.send({
      components: [
        new MessageActionRow().addComponents([dropdown]),
        previousPageButton && nextPageButton
          ? new MessageActionRow().addComponents([
              previousPageButton,
              nextPageButton,
            ])
          : undefined,
      ].filter((c) => !!c),
    });
  }

  async getReminderListComponents(
    context: ApplicationCommandMessage | ComponentMessage,
    page: number
  ) {
    const reminderCount = (await this.client.db
      .query("SELECT COUNT(*) FROM remind WHERE uid=$1", [context.author.id])
      .first()
      .then((r) => r.get("count"))
      .catch(() => -1n)) as bigint;
    if (reminderCount == -1n)
      return await context.error("COMMAND_ERROR_500", {
        status: constants.url.fireStatus,
      });
    else if (!reminderCount)
      return await context.error("REMINDERS_LIST_NONE_FOUND");

    let previousPageButton: MessageButton, nextPageButton: MessageButton;
    const pages = Math.ceil(Number(reminderCount / 10n));
    if (pages > 1)
      (previousPageButton = new MessageButton()
        .setEmoji(this.client.util.useEmoji("PAGINATOR_BACK"))
        .setDisabled(page === 0)
        .setStyle("PRIMARY")
        .setCustomId(`reminders-list-page:${context.author.id}:${page - 1}`)),
        (nextPageButton = new MessageButton()
          .setEmoji(this.client.util.useEmoji("PAGINATOR_FORWARD"))
          .setStyle("PRIMARY")
          .setDisabled(page === pages - 1)
          .setCustomId(`reminders-list-page:${context.author.id}:${page + 1}`));

    const dropdown = new MessageSelectMenu()
      .setCustomId(`reminders-list:${context.author.id}`)
      .setPlaceholder(
        context.language.get("REMINDERS_LIST_DROPDOWN_PLACEHOLDER")
      )
      .setMinValues(1)
      .setMaxValues(1);

    const remindersResult = await this.client.db.query(
      "SELECT * FROM remind WHERE uid=$1 ORDER BY forwhen LIMIT 10 OFFSET $2",
      [context.author.id, page * 10]
    );
    for await (const reminder of remindersResult) {
      const forwhen = reminder.get("forwhen") as Date,
        text = reminder.get("reminder") as string;
      dropdown.addOptions({
        label: this.client.util.shortenText(
          text.includes("http")
            ? this.client.util.stripMaskedLinks(text)
            : text,
          100
        ),
        description: this.client.util.getRelativeTimeString(
          forwhen,
          context.language
        ),
        value: (+forwhen).toString(),
      });
    }

    return { dropdown, previousPageButton, nextPageButton };
  }
}
