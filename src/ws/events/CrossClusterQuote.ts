import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import Quote from "@fire/src/commands/Utilities/quote";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class CrossClusterQuote extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.CROSS_CLUSTER_QUOTE);
  }

  async run(
    data: MessageLinkMatch & {
      destination: PartialQuoteDestination;
      webhook: string;
      quoter: string;
    }
  ) {
    this.manager.client.console.info(
      `[Aether] Received cross cluster quote request for guild ${data.guild_id}`
    );
    let { destination } = data;
    const quoteCommand = this.manager.client.getCommand("quote") as Quote;
    if (!quoteCommand) return;
    const guild = this.manager.client.guilds.cache.get(data.guild_id);
    if (!guild) return;
    destination.guild = guild as FireGuild;
    const member = await guild.members.fetch(data.quoter).catch(() => {});
    if (!member) return;
    const channel = guild.channels.cache
      .filter((channel) => channel.type == "text")
      .get(data.channel_id) as FireTextChannel;
    if (!channel) return;
    const message = await channel.messages
      .fetch({
        limit: 1,
        around: data.message_id,
      })
      .then((collection) => collection.first())
      .catch(() => {});
    if (!message) return;
    await quoteCommand.exec(null, {
      quote: message as FireMessage,
      quoter: member as FireMember,
      webhook: data.webhook,
      destination,
    });
  }
}
