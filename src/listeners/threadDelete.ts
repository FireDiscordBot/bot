import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { ThreadChannel } from "discord.js";

export default class ThreadDelete extends Listener {
  constructor() {
    super("threadDelete", {
      emitter: "client",
      event: "threadDelete",
    });
  }

  async exec(thread: ThreadChannel) {
    const guild = thread.guild as FireGuild;

    if (guild.ticketIds.includes(thread.id)) {
      const newTickets = guild.ticketIds.filter((c) => c != thread.id);
      if (newTickets.length) guild.settings.set("tickets.channels", newTickets);
      else guild.settings.delete("tickets.channels");
    }
  }
}
