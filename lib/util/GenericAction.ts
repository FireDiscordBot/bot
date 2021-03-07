import {
  PartialTypes,
  NewsChannel,
  BaseManager,
  Snowflake,
  Constants,
} from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "../extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Fire } from "@fire/lib/Fire";

const { PartialTypes } = Constants;

/*

ABOUT ACTIONS

Actions are similar to WebSocket Packet Handlers, but since introducing
the REST API methods, in order to prevent rewriting code to handle data,
"actions" have been introduced. They're basically what Packet Handlers
used to be but they're strictly for manipulating data and making sure
that WebSocket events don't clash with REST methods.

*/

export class GenericAction {
  client: Fire;

  constructor(client: Fire) {
    this.client = client;
  }

  handle(data: any) {
    return data;
  }

  getPayload(
    data: any,
    manager: BaseManager<Snowflake, any, any>,
    id: string,
    partialType: PartialTypes,
    cache?: boolean
  ) {
    const existing = manager.cache.get(id);
    if (!existing && this.client.options.partials.includes(partialType)) {
      return manager.add(data, cache);
    }
    return existing;
  }

  getChannel(data: any) {
    const id = data.channel_id || data.id;
    return (
      data.channel ||
      this.getPayload(
        {
          id,
          guild_id: data.guild_id,
          recipients: [data.author || { id: data.user_id }],
        },
        this.client.channels,
        id,
        PartialTypes.CHANNEL
      )
    );
  }

  getMessage(data: any, channel: FireTextChannel | NewsChannel, cache: boolean) {
    const id = data.message_id || data.id;
    return (
      data.message ||
      this.getPayload(
        {
          id,
          channel_id: channel.id,
          guild_id: data.guild_id || (channel.guild ? channel.guild.id : null),
        },
        channel.messages,
        id,
        PartialTypes.MESSAGE,
        cache
      )
    );
  }

  getReaction(data: any, message: FireMessage, user: FireMember | FireUser) {
    const id = data.emoji.id || decodeURIComponent(data.emoji.name);
    return this.getPayload(
      {
        emoji: data.emoji,
        count: message.partial ? null : 0,
        me: user ? user.id === this.client.user.id : false,
      },
      message.reactions,
      id,
      PartialTypes.REACTION
    );
  }

  getMember(data: any, guild: FireGuild) {
    return this.getPayload(
      data,
      guild.members,
      data.user.id,
      PartialTypes.GUILD_MEMBER
    );
  }

  getUser(data: any) {
    const id = data.user_id;
    return (
      data.user ||
      this.getPayload({ id }, this.client.users, id, PartialTypes.USER)
    );
  }

  getUserFromMember(data: any) {
    if (data.guild_id && data.member && data.member.user) {
      const guild = this.client.guilds.cache.get(data.guild_id) as FireGuild;
      if (guild) {
        const member = this.getMember(data.member, guild);
        return member ? member.user : undefined;
      }
    }
    return this.getUser(data);
  }
}
