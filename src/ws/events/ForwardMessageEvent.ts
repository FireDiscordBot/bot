import { Manager } from "@fire/lib/Manager";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";
import {
  BaseMessageComponentOptions,
  MessageActionRowOptions,
  MessageEmbed,
  MessageEmbedOptions,
} from "discord.js";

export default class ForwardMessage extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.FORWARD_MESSAGE);
  }

  async run(data: {
    components?: (Required<BaseMessageComponentOptions> &
      MessageActionRowOptions)[];
    message: string | MessageEmbedOptions[];
    parseUsers: Snowflake[];
    channel?: Snowflake;
  }) {
    if (!this.manager.client.channels.cache.has(data.channel)) return;

    let content = typeof data.message == "string" ? data.message : null;
    let embeds: MessageEmbedOptions[] | MessageEmbed[] = Array.isArray(
      data.message
    )
      ? data.message
      : null;
    for (const id of data.parseUsers) {
      const user = await this.manager.client.users.fetch(id).catch(() => {});
      if (user)
        if (content)
          content = content.replace(
            new RegExp(id, "gim"),
            `${user} (${user.id})`
          );
        else
          embeds = embeds.map(
            (e) =>
              JSON.parse(
                JSON.stringify(e).replace(
                  new RegExp(id, "gim"),
                  `${user} (${user.id})`
                )
              ) as MessageEmbedOptions
          );
    }

    if (embeds) {
      for (const [index] of embeds.entries())
        try {
          embeds[index] = new MessageEmbed(
            embeds[index] as MessageEmbedOptions
          );
        } catch {
          embeds = null;
        }
    }

    const channel = this.manager.client.channels.cache.get(
      data.channel
    ) as FireTextChannel;
    if (channel.isText())
      await channel
        .send({
          embeds: embeds as MessageEmbed[],
          components: data.components,
          content,
        })
        .catch(() => {});
  }
}
