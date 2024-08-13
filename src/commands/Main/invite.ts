import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";

export default class Invite extends Command {
  constructor() {
    super("invite", {
      description: (language: Language) =>
        language.get("INVITE_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    if (process.env.NODE_ENV == "development" && !command.author.isSuperuser())
      return await command.error("INVITE_LOCAL_INSTANCE");

    return await command.channel.send({
      content: `${command.language.get(
        "INVITE_RESPONSE_TEXT"
      )}[󠄴\u200b](https://canary.discord.com/application-directory/${
        process.env.NODE_ENV == "development"
          ? constants.prodBotId // used for testing
          : this.client.user.id
      }  '${command.language.get(
        "INVITE_APP_DIRECTORY_ALT"
      )}')[󠄴\u200b](https://discord.gg/firebot  '${command.language.get(
        "INVITE_SUPPORT_SERVER_ALT"
      )}')`,
    });
  }
}
