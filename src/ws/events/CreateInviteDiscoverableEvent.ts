import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";
import { Snowflake } from "discord.js";

export default class CreateInviteDiscoverableEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.CREATE_INVITE_DISCOVERABLE);
  }

  async run(data: { id: Snowflake }, nonce?: string) {
    const guild = this.manager.client?.guilds.cache.get(data.id) as FireGuild;
    if (!guild || !guild.features.includes("DISCOVERABLE")) return;

    if (guild.features.includes("VANITY_URL")) {
      if (guild.vanityURLCode)
        return this.manager.ws.send(
          MessageUtil.encode(
            new Message(
              EventType.CREATE_INVITE_DISCOVERABLE,
              {
                code: guild.vanityURLCode,
              },
              nonce
            )
          )
        );
      const vanity = await guild.fetchVanityData().catch(() => {});
      if (vanity && vanity.code)
        return this.manager.ws.send(
          MessageUtil.encode(
            new Message(
              EventType.CREATE_INVITE_DISCOVERABLE,
              {
                code: vanity.code,
              },
              nonce
            )
          )
        );
    }

    const invite = await (
      guild.systemChannel ||
      guild.rulesChannel ||
      guild.guildChannels.cache.first()
    )
      .createInvite({
        unique: true,
        temporary: false,
        maxAge: 300,
        maxUses: 1,
        reason: guild.language.get("PUBLIC_DISCOVERABLE_INVITE"),
      })
      .catch(() => {});
    if (invite && invite.code)
      return this.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.CREATE_INVITE_DISCOVERABLE,
            invite.toJSON(),
            nonce
          )
        )
      );
  }
}
