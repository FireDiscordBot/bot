import { FireGuild } from "@fire/lib/extensions/guild";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Snowflake } from "discord-api-types/globals";

export default class CreateInviteDiscoverableEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.CREATE_INVITE_DISCOVERABLE);
  }

  private noInvite(nonce: string) {
    this.manager.ws.send(
      MessageUtil.encode(
        new Message(
          EventType.CREATE_INVITE_DISCOVERABLE,
          {
            code: null,
          },
          nonce
        )
      )
    );
  }

  async run(data: { id: Snowflake; reason?: string }, nonce?: string) {
    const guild = this.manager.client?.guilds.cache.get(data.id) as FireGuild;
    if (
      !guild ||
      !guild.features.includes("DISCOVERABLE") ||
      !guild.members.me
        ?.permissionsIn(guild.discoverableInviteChannel)
        ?.has(PermissionFlagsBits.CreateInstantInvite)
    )
      return this.noInvite(nonce);

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

    const invite = await guild.discoverableInviteChannel
      ?.createInvite({
        unique: true,
        temporary: false,
        maxAge: 300,
        maxUses: 1,
        reason: data.reason ?? guild.language.get("PUBLIC_DISCOVERABLE_INVITE"),
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
    else return this.noInvite(nonce);
  }
}
