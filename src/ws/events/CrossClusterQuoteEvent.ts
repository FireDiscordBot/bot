import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import { Fire } from "@fire/lib/Fire";
import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { Manager } from "@fire/lib/Manager";
import { MessageIterator } from "@fire/lib/util/iterators";
import { ThreadhookClient } from "@fire/lib/util/threadhookclient";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import Quote from "@fire/src/commands/Utilities/quote";
import { Constants as AkairoConstants } from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";
import { Constants, NewsChannel, ThreadChannel } from "discord.js";

const { CommandHandlerEvents } = AkairoConstants;

export default class CrossClusterQuote extends Event {
  client: Fire;

  constructor(manager: Manager) {
    super(manager, EventType.CROSS_CLUSTER_QUOTE);
    this.client = manager.client;
  }

  async run(
    data: MessageLinkMatch & {
      destination: PartialQuoteDestination;
      quoter: Snowflake;
      webhook: {
        id: Snowflake;
        token: string;
        threadId?: Snowflake;
      };
      debug: boolean;
    }
  ) {
    if (!data.destination)
      return this.console[data.debug ? "warn" : "debug"](
        "Attempted cross cluster quote with no destination",
        JSON.stringify(data)
      );
    this.console[data.debug ? "log" : "debug"](
      `Received cross cluster quote for ${data.destination.guild_id}/${data.destination.id}/${data.message_id} from quoter ${data.quoter}`
    );

    let { destination } = data;
    const quoteCommand = this.client.getCommand("quote") as Quote;
    if (!quoteCommand) return;

    // Handle saved quotes first since we don't need to fetch anything
    const link = `${data.guild_id}/${data.channel_id}/${data.message_id}`;
    if (quoteCommand && quoteCommand.savedQuotes.has(link)) {
      const guild = this.client.guilds.cache.get(destination.guild_id);
      const saved = quoteCommand.savedQuotes.get(link);
      if (saved instanceof FireMessage && saved.savedToQuoteBy == data.quoter) {
        const quoter = guild
          ? ((await guild.members.fetch(data.quoter)) as FireMember)
          : ((await this.client.users.fetch(data.quoter)) as FireUser);
        return await saved.quote(
          destination,
          quoter,
          new ThreadhookClient(
            { id: data.webhook.id, token: data.webhook.token },
            { threadId: data.webhook.threadId }
          )
        );
      }
    }

    let guild = this.client.guilds.cache.get(data.guild_id) as FireGuild;
    if (!guild) return;
    destination.guild = guild;
    const member = (await guild.members
      .fetch(data.quoter)
      .catch(() => {})) as FireMember;
    if (!member)
      return this.console.warn(
        "Attempted cross cluster quote with unknown member"
      );
    const channel = guild.channels.cache
      .filter((channel) => channel.isText() || channel.isThread())
      .get(data.channel_id) as FireTextChannel | NewsChannel | ThreadChannel;
    if (!channel)
      return this.console.warn(
        "Attempted cross cluster quote with unknown channel"
      );
    const message = (await channel.messages
      .fetch(data.message_id)
      .catch(() => {})) as FireMessage;
    if (!message)
      return this.console.warn(
        "Attempted cross cluster quote with unknown message"
      );

    if (
      data.end_channel_id &&
      data.guild_id == data.end_guild_id &&
      data.channel_id == data.end_channel_id
    ) {
      let limit = 5;
      if (member.premium) limit = 10;
      if (member.isSuperuser()) limit = 50;

      const source = this.client.channels.cache.get(data.channel_id);
      if (source && "messages" in source) {
        const iterator = new MessageIterator(source, {
          limit,
          after: data.message_id,
          before: (BigInt(data.end_message_id) + 1n).toString(),
        });
        const messages = await iterator.flatten().catch(() => []);
        if (messages.length && messages.at(-1)?.id == data.end_message_id)
          data.iteratedMessages = messages;
      }
    }

    if (message.reference?.type == Constants.MessageReferenceType.FORWARD) {
      const { reference } = message;
      const shard = this.client.util.getShard(reference.guildId);
      if (!(this.client.options.shards as number[]).includes(shard))
        // back to you in the studio (and by studio, I mean aether)
        return quoteCommand.returnCrossClusterQuote(
          destination,
          {
            guild_id: reference.guildId,
            channel_id: reference.channelId,
            message_id: reference.messageId,
          },
          data.quoter,
          data.webhook
        );
    } else
      await message.quote(
        destination,
        member,
        new ThreadhookClient(
          { id: data.webhook.id, token: data.webhook.token },
          { threadId: data.webhook.threadId }
        )
      );

    if (data.iteratedMessages)
      for (const iterated of data.iteratedMessages)
        await iterated.quote(
          destination,
          member,
          new ThreadhookClient(
            { id: data.webhook.id, token: data.webhook.token },
            { threadId: data.webhook.threadId }
          )
        );
  }
}
