import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Support extends Command {
  constructor() {
    super("support", {
      description: (language: Language) =>
        language.get("SUPPORT_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    await command.channel.send({ content: `<${constants.url.support}>` });
  }
}
