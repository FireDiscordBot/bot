import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Listener } from "@fire/lib/util/listener";
import { Channel, Snowflake, ThreadChannel } from "discord.js";

export default class Modal extends Listener {
  constructor() {
    super("modal", {
      emitter: "client",
      event: "modal",
    });
  }

  // used to handle generic modals like the ticket close reason modal
  async exec(modal: ModalMessage) {
    const guild = modal.guild;

    if (modal.customId.startsWith("ticket_close")) {
      const channelId = modal.customId.slice(13) as Snowflake;
      const channel = this.client.channels.cache.get(channelId) as
        | FireTextChannel
        | ThreadChannel;
      if (
        !channel ||
        !channel.guild ||
        (channel.type != "GUILD_TEXT" && channel.type != "GUILD_PRIVATE_THREAD")
      )
        return;
      const canClose = await modal.guild.canCloseTicket(channel, modal.member);
      if (canClose == "forbidden")
        return await modal.error("TICKET_CLOSE_FORBIDDEN");
      else if (canClose == "nonticket")
        return await modal.error("TICKET_NON_TICKET");
      const reason = modal.interaction.getTextInputValue("close_reason");
      if (!reason)
        return await modal.error("COMMAND_ERROR_GENERIC", { id: "close" });
      const closure = await guild
        .closeTicket(channel, modal.member, reason)
        .catch(() => {});
      if (closure instanceof Channel) return await modal.channel.ack();
    }
  }
}
