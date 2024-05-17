import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class Starboard extends Command {
  constructor() {
    super("starboard", {
      description: (language: Language) =>
        language.get("STARBOARD_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      group: true,
    });
  }

  async run(command: ApplicationCommandMessage) {}
}
