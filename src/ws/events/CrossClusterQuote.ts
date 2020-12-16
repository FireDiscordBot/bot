import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "../../../lib/interfaces/messages";
import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { EventType } from "../../../lib/ws/util/constants";
import { FireGuild } from "../../../lib/extensions/guild";
import { Event } from "../../../lib/ws/event/Event";
import Quote from "../../commands/Utilities/quote";
import { Manager } from "../../../lib/Manager";
import { TextChannel } from "discord.js";

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
      .get(data.channel_id) as TextChannel;
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
