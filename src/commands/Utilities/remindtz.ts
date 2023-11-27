import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class RemindersTimezone extends Command {
  constructor() {
    super("reminders-timezone", {
      description: (language: Language) =>
        language.get("REMINDERS_TIMEZONE_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      parent: "reminders",
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    if (command.author.settings.has("reminders.timezone.waiting"))
      return await command.error("REMINDERS_TIMEZONE_ALREADY_WAITING");
    await command.author.settings.set("reminders.timezone.waiting", true);
    return await command.success("REMINDERS_TIMEZONE_NOW_WAITING");
  }
}
