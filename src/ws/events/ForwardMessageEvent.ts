import { MessageActionRowOptions, MessageEmbed, Snowflake } from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { APIEmbed } from "discord-api-types";
import { Manager } from "@fire/lib/Manager";

export default class ForwardMessageEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.FORWARD_MESSAGE);
  }

  async run(data: {
    buttons?: MessageActionRowOptions[];
    message: string | APIEmbed;
    parseUsers: Snowflake[];
    channel?: Snowflake;
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
    if (channel.isText())
      await channel
        .send(content, {
          embed: embed ? new MessageEmbed(JSON.parse(embed)) : null,
          components: data.buttons,
        })
        .catch(() => {});
  }
}
