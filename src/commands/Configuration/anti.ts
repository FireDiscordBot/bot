import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { CommonContext } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { MessageActionRow, MessageButton, Permissions } from "discord.js";

export default class Anti extends Command {
  valid = ["everyone", "zws", "spoiler"];
  constructor() {
    super("anti", {
      description: (language: Language) =>
        language.get("ANTI_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      args: [],
    });
  }

  async run(command: ApplicationCommandMessage) {
    const components = this.getMenuComponents(command);
    return await command.send("ANTI_CURRENT_OPTIONS", {
      components,
    });
  }

  getMenuComponents(context: CommonContext) {
    if (!context.guild) return [];
    return [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("!anti:everyone")
          .setLabel(context.language.get("ANTI_EVERYONE"))
          .setStyle(
            context.guild.settings.get<boolean>("mod.antieveryone", false)
              ? "SUCCESS"
              : "DANGER"
          ),
        new MessageButton()
          .setCustomId("!anti:zws")
          .setLabel(context.language.get("ANTI_ZWS"))
          .setStyle(
            context.guild.settings.get<boolean>("mod.antizws", false)
              ? "SUCCESS"
              : "DANGER"
          )
      ),
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("!anti:spoiler")
          .setLabel(context.language.get("ANTI_SPOILER"))
          .setStyle(
            context.guild.settings.get<boolean>("mod.antispoilers", false)
              ? "SUCCESS"
              : "DANGER"
          )
      ),
    ];
  }
}
