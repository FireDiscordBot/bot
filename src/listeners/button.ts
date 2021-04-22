import { ButtonMessage } from "@fire/lib/extensions/buttonMessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Listener } from "@fire/lib/util/listener";
import Sk1er from "../modules/sk1er";

const validSk1erTypes = ["general", "purchase", "bug"];
// temp to handle both reactions and buttons
const sk1erSupportEmojis = {
  general: "🖥️",
  purchase: "💸",
  bug: "🐛",
};

export default class Button extends Listener {
  constructor() {
    super("button", {
      emitter: "client",
      event: "button",
    });
  }

  // used to handle generic buttons, like ticket close or reaction roles
  async exec(message: ButtonMessage) {
    // handle ticket close buttons
    if (message.custom_id.startsWith("ticket_close")) {
      const { guild } = message;
      if (!guild) return;
      const channelId = message.custom_id.slice(13);
      const channel = this.client.channels.cache.get(
        channelId
      ) as FireTextChannel;
      if (!channel || !channel.guild || channel.type != "text") return;
      if (guild.tickets.find((ticket) => ticket.id == channelId)) {
        const closure = await guild
          .closeTicket(
            channel,
            message.member,
            guild.language.get("TICKET_CLOSE_BUTTON") as string
          )
          .catch(() => {});
        if (closure == "forbidden")
          return await message.error("TICKET_CLOSE_FORBIDDEN");
        else if (closure == "nonticket")
          return await message.error("TICKET_NON_TICKET");
      } else return;
    }

    if (message.custom_id.startsWith("sk1er_support_")) {
      const type = message.custom_id.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      if (sk1erModule.ticketConfirm.includes(message.author.id)) {
        sk1erModule.ticketConfirm = sk1erModule.ticketConfirm.filter(
          (id) => id != message.author.id
        );
        const ticket = await sk1erModule
          .handleSupport(message, message.author, sk1erSupportEmojis[type])
          .catch((e: Error) => e);
        if (!(ticket instanceof FireTextChannel))
          this.client.console.error(
            `[Sk1er] Failed to make ticket for ${message.author} due to ${ticket}`
          );
        return;
      } else {
        sk1erModule.ticketConfirm.push(message.author.id);
        message.flags += 64; // set ephemeral
        return await message.error("SK1ER_SUPPORT_CONFIRM");
      }
    }
  }
}
