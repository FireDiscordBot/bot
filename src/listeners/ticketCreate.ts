import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import Sk1er from "@fire/src/modules/sk1er";

export default class TicketCreate extends Listener {
  constructor() {
    super("ticketCreate", {
      emitter: "client",
      event: "ticketCreate",
    });
  }

  async exec(author: FireMember, ticket: FireTextChannel, message: FireMessage) {
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (author.guild.id != sk1erModule.supportGuildId) return;
    const channel =
      sk1erModule.supportChannel ||
      (sk1erModule.supportGuild.channels.cache.get(
        sk1erModule.supportChannelId
      ) as FireTextChannel);
    await channel
      .updateOverwrite(author, {
        VIEW_CHANNEL: false,
      })
      .catch(() => {});
  }
}
