import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";
import { TextChannel } from "discord.js";

export default class ForwardMessageEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.FORWARD_MESSAGE);
  }

  async run(data: {
    parseUsers?: string[];
    message: string;
    channel?: string;
  }) {
    if (!this.manager.client.channels.cache.has(data.channel)) return;

    let content = data.message;
    for (const id of data.parseUsers) {
      const user = await this.manager.client.users.fetch(id).catch(() => {});
      if (user)
        content = content.replace(
          new RegExp(id, "gim"),
          `${user} (${user.id})`
        );
    }
    const channel = this.manager.client.channels.cache.get(
      data.channel
    ) as TextChannel;
    if (channel.type == "text") await channel.send(content).catch(() => {});
  }
}
