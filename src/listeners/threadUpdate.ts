import { getIDMatch } from "@fire/lib/util/converters";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import ChannelUpdate from "./channelUpdate";
import { ThreadChannel } from "discord.js";

export default class ThreadUpdate extends Listener {
  constructor() {
    super("threadUpdate", {
      emitter: "client",
      event: "threadUpdate",
    });
  }

  async exec(before: ThreadChannel, after: ThreadChannel) {
    const channelListener = this.client.getListener(
      "channelUpdate"
    ) as ChannelUpdate;
    if (!channelListener) return; // should realistically never happen but who knows
    const guild = after.guild as FireGuild;

    await channelListener.exec(before, after);

    if (
      before.archived &&
      !after.archived &&
      guild.tickets.find((t) => t.id == after.id)
    ) {
      const authorId = getIDMatch(after.name, true);
      if (authorId)
        await after.members
          .add(authorId, guild.language.get("TICKET_REOPEN_REASON"))
          .catch(() => {});
    }
  }
}
