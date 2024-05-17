import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
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

  async run(command: ApplicationCommandMessage) {
    const inviteReq = await centra(this.client.config.inviteLink)
      .header("User-Agent", this.client.manager.ua)
      .header("Referer", command.url)
      .send();
    return await command.channel.send({
      content: command.language.get("INVITE_COMMAND_CONTENT"),
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("INVITE"))
            .setURL(inviteReq.headers.location)
        ),
      ],
    });
  }
}
