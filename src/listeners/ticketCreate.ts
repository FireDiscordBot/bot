import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { TextChannel } from "discord.js";
import Sk1er from "../modules/sk1er";

export default class TicketCreate extends Listener {
  constructor() {
    super("ticketCreate", {
      emitter: "client",
      event: "ticketCreate",
    });
  }

  async exec(author: FireMember, ticket: TextChannel, message: FireMessage) {
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (author.guild.id != sk1erModule.supportGuildId) return;
    const channel =
      sk1erModule.supportChannel ||
      (sk1erModule.supportGuild.channels.cache.get(
        sk1erModule.supportChannelId
      ) as TextChannel);
    await channel
      .updateOverwrite(author, {
        VIEW_CHANNEL: false,
      })
      .catch(() => {});
  }
}
