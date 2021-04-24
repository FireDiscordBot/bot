import { ButtonMessage } from "@fire/lib/extensions/buttonMessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Listener } from "@fire/lib/util/listener";
import Sk1er from "../modules/sk1er";

const validSk1erTypes = ["general", "purchase", "bug"];
const validPaginatorIds = ["close", "start", "back", "forward", "end"];

export default class Button extends Listener {
  constructor() {
    super("button", {
      emitter: "client",
      event: "button",
    });
  }

  // used to handle generic buttons, like ticket close or reaction roles
  async exec(button: ButtonMessage) {
    // Run handlers
    try {
      if (this.client.buttonHandlers.has(button.custom_id))
        this.client.buttonHandlers.get(button.custom_id)(button);
    } catch {}
    try {
      if (this.client.buttonHandlersOnce.has(button.custom_id)) {
        const handler = this.client.buttonHandlersOnce.get(button.custom_id);
        this.client.buttonHandlersOnce.delete(button.custom_id);
        handler(button);
      }
    } catch {}

    // handle ticket close buttons
    if (button.custom_id.startsWith("ticket_close")) {
      const { guild } = button;
      if (!guild) return;
      const channelId = button.custom_id.slice(13);
      const channel = this.client.channels.cache.get(
        channelId
      ) as FireTextChannel;
      if (!channel || !channel.guild || channel.type != "text") return;
      if (guild.tickets.find((ticket) => ticket.id == channelId)) {
        const closure = await guild
          .closeTicket(
            channel,
            button.member,
            guild.language.get("TICKET_CLOSE_BUTTON") as string
          )
          .catch(() => {});
        if (closure == "forbidden")
          return await button.error("TICKET_CLOSE_FORBIDDEN");
        else if (closure == "nonticket")
          return await button.error("TICKET_NON_TICKET");
      } else return;
    }

    if (button.custom_id.startsWith("sk1er_support_")) {
      const type = button.custom_id.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      if (sk1erModule.ticketConfirm.includes(`${button.author.id}_${type}`)) {
        sk1erModule.ticketConfirm = sk1erModule.ticketConfirm.filter(
          (id) => id != `${button.author.id}_${type}`
        );
        const ticket = await sk1erModule
          .handleSupport(button, button.author)
          .catch((e: Error) => e);
        if (!(ticket instanceof FireTextChannel))
          this.client.console.error(
            `[Sk1er] Failed to make ticket for ${button.author} due to ${ticket}`
          );
        return;
      } else {
        sk1erModule.ticketConfirm.push(`${button.author.id}_${type}`);
        button.flags += 64; // set ephemeral
        return await button.error("SK1ER_SUPPORT_CONFIRM");
      }
    }

    if (
      validPaginatorIds.includes(button.custom_id) &&
      button.message?.paginator &&
      button.message.paginator.ready &&
      button.message.paginator.owner?.id == button.author.id
    )
      await button.message?.paginator.buttonHandler(button).catch(() => {});
    else if (
      !button.channel.messages.cache.has(button.message?.id) &&
      button.custom_id == "close"
    )
      await button.message?.delete().catch(() => {});
  }
}
