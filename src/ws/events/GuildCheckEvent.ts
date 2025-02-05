import { FireMember } from "@fire/lib/extensions/guildmember";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { APIGuildMember } from "discord-api-types/v9";
import { Snowflake } from "discord-api-types/globals";

export default class GuildCheckEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.GUILD_CHECK);
  }

  static getMemberJSON(member: FireMember | APIGuildMember) {
    if (!member) return null;
    if (member instanceof FireMember) {
      const user = member.user;
      return {
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          discriminator: user.discriminator,
          bot: user.bot,
          public_flags: user.flags?.bitfield || 0,
        },
        roles: member.roles.cache.map((role) => role.id),
        nick: member.nickname,
        premium_since: member.premiumSince?.toISOString(),
        joined_at: member.joinedAt?.toISOString(),
        pending: member.pending,
        mute: member.voice?.mute || false,
        deaf: member.voice?.deaf || false,
        permissions: member.permissions?.bitfield?.toString(),
      };
    } else {
      const user = member.user;
      return {
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          discriminator: user.discriminator,
          bot: user.bot,
          public_flags: user.public_flags || 0,
        },
        roles: member.roles,
        nick: member.nick,
        premium_since: member.premium_since,
        joined_at: member.joined_at,
        pending: member.pending,
        mute: member.mute,
        deaf: member.deaf,
        permissions: "0",
      };
    }
  }

  async run(data: { id: Snowflake }, nonce: string) {
    this.manager.ws.send(
      MessageUtil.encode(
        new Message(
          EventType.GUILD_CHECK,
          {
            id: data.id,
            has: this.manager.client?.guilds.cache.has(data.id),
            member: GuildCheckEvent.getMemberJSON(
              this.manager.client?.guilds.cache.get(data.id)?.members
                .me as FireMember
            ),
          },
          nonce
        )
      )
    );
  }
}
