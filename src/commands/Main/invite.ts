import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";

export default class Invite extends Command {
  constructor() {
    super("invite", {
      description: (language: Language) =>
        language.get("INVITE_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    return await command.channel.send({
      content: `[󠄴](https://canary.discord.com/application-directory/444871677176709141  '${command.language.get(
        "INVITE_COMMAND_APP_DIRECTORY_ALT"
      )}')[󠄴](https://discord.gg/firebot  '${command.language.get(
        "INVITE_COMMAND_SUPPORT_SERVER_ALT"
      )}')`,
    });
  }
}
