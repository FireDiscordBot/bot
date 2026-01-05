import { Manager } from "@fire/lib/Manager";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord.js";

export default class GetExtendedDiscoverable extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.GET_EXTENDED_DISCOVERABLE);
  }

  async run(data: { serverId: Snowflake }, nonce: string) {
    if (!this.manager.ws?.open) return;

    const guild = this.manager.client.guilds.cache.get(
      data.serverId
    ) as FireGuild;
    if (!guild)
      return this.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.GET_EXTENDED_DISCOVERABLE, null, nonce)
        )
      );
    else if (!guild.isPublic())
      return this.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.GET_EXTENDED_DISCOVERABLE,
            {
              success: false,
              error: "Server is not discoverable",
            },
            nonce
          )
        )
      );

    const extended = await guild.getExtendedDiscoverableData();
    this.manager.ws.send(
      MessageUtil.encode(
        new Message(
          EventType.GET_EXTENDED_DISCOVERABLE,
          { success: true, data: extended },
          nonce
        )
      )
    );
  }
}
