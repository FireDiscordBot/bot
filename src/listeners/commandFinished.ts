import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";

export default class CommandFinished extends Listener {
  constructor() {
    super("commandFinished", {
      emitter: "commandHandler",
      event: "commandFinished",
    });
  }

  async exec(message: FireMessage | ApplicationCommandMessage) {
    if (
      message instanceof ApplicationCommandMessage ||
      message.deleted ||
      !message.channel ||
      message.channel?.deleted
    )
      return;

    const chance = this.client.util.randInt(0, 100);
    if (
      chance > 30 &&
      chance < 50 &&
      message.util?.parsed?.command?.id != "help"
    ) {
      const upsellEmbed = await this.client.util.getSlashUpsellEmbed(message);
      if (upsellEmbed)
        return await message
          .reply({
            embeds: [upsellEmbed],
            allowedMentions: { repliedUser: true },
          })
          .catch(() => {});
    }

    // member cache sweep ignores members with
    // an active command util so once the command
    // finishes, we can dispose of the command util
    this.client.commandHandler.commandUtils.delete(message.id);
  }
}
