import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import Essential from "@fire/src/modules/essential";

export default class FakeLatestLogTag extends Command {
  constructor() {
    super("latestlog", {
      description: (language: Language) =>
        language.get("TAG_SLASH_DESCRIPTION", {
          tag: "latestlog",
        }),
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      hidden: true,
      guilds: ["864592657572560958"],
    });
  }

  async run(command: ApplicationCommandMessage) {
    const essentialModule = this.client.getModule("essential") as Essential;
    if (!essentialModule) return await command.error("COMMAND_ERROR_GENERIC");
    await essentialModule.sendInitialLogDropdown(command.realChannel);
  }
}
