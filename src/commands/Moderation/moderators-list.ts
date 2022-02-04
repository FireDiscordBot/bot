import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import Moderators from "./moderators";

export default class ListModerators extends Command {
  constructor() {
    super("moderators-list", {
      description: (language: Language) =>
        language.get("MODERATORS_LIST_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      parent: "moderators",
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    return (this.parentCommand as Moderators).getModeratorEmbed(command);
  }
}
