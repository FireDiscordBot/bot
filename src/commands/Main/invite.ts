import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageActionRow, MessageButton } from "discord.js";

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

  async exec(message: FireMessage) {
    return await message.channel.send({
      content: message.language.get("INVITE_COMMAND_CONTENT"),
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(message.language.get("INVITE"))
            .setURL(this.client.config.rawInvite(this.client))
        ),
      ],
    });
  }
}
