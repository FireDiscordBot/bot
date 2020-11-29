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
    if (message.embeds.length) {
      const embed = message.embeds[0];
      embed.setDescription(`Please describe your issue in as much detail as possible, videos and screenshots are accepted aswell.
      
A member of staff will review your ticket as soon as possible.
Some tickets, especially those relating to purchases, can only be handled by Sk1er, which may take longer than a typical ticket`);
      await message.edit(embed).catch(() => {});
      if (!author.isModerator())
        await ticket
          .send("<@&755809868056756235>", {
            allowedMentions: { roles: ["755809868056756235"] },
          })
          .catch(() => {});
    }
  }
}
