import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { APIEmbed } from "discord-api-types";
import { Manager } from "@fire/lib/Manager";
import { MessageEmbed } from "discord.js";

export default class ForwardMessageEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.FORWARD_MESSAGE);
  }

  async run(data: {
    message: string | APIEmbed;
    parseUsers?: string[];
    channel?: string;
  }) {
    if (!this.manager.client.channels.cache.has(data.channel)) return;

    let content = typeof data.message == "string" ? data.message : null;
    let embed =
      typeof data.message == "object" ? JSON.stringify(data.message) : null;
    for (const id of data.parseUsers) {
      const user = await this.manager.client.users.fetch(id).catch(() => {});
      if (user)
        content = (content ?? embed).replace(
          new RegExp(id, "gim"),
          `${user} (${user.id})`
        );
    }

    if (embed) {
      try {
        new MessageEmbed(JSON.parse(embed));
      } catch {
        embed = null;
      }
    }

    const channel = this.manager.client.channels.cache.get(
      data.channel
    ) as FireTextChannel;
    if (channel.type == "text")
      await channel
        .send(content, {
          embed: embed ? new MessageEmbed(JSON.parse(embed)) : null,
        })
        .catch(() => {});
  }
}
