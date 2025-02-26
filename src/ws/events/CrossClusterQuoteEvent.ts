import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import Quote from "@fire/src/commands/Utilities/quote";
import { Constants } from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";
import { NewsChannel, ThreadChannel } from "discord.js";

const { CommandHandlerEvents } = Constants;

export default class CrossClusterQuote extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.CROSS_CLUSTER_QUOTE);
  }

  async run(
    data: MessageLinkMatch & {
      destination: PartialQuoteDestination;
      quoter: Snowflake;
      webhook: string;
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
    const quoteCommand = this.manager.client.getCommand("quote") as Quote;
    if (!quoteCommand) return;
    const link = `${data.guild_id}/${data.channel_id}/${data.message_id}`;
    if (quoteCommand && quoteCommand.savedQuotes.has(link)) {
      const guild = this.manager.client.guilds.cache.get(destination.guild_id);
      const saved = quoteCommand.savedQuotes.get(link);
      if (saved instanceof FireMessage && saved.savedToQuoteBy == data.quoter) {
        const quoter = guild
          ? ((await guild.members.fetch(data.quoter)) as FireMember)
          : ((await this.manager.client.users.fetch(data.quoter)) as FireUser);
        return await quoteCommand.exec(null, {
          quote: saved,
          quoter: quoter,
          webhook: data.webhook,
          debug: data.debug,
          destination,
        });
      }
    }
    const guild = this.manager.client.guilds.cache.get(data.guild_id);
    if (!guild) return;
    destination.guild = guild as FireGuild;
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
    const message = await channel.messages
      .fetch(data.message_id)
      .catch(() => {});
    if (!message)
      return this.console.warn(
        "Attempted cross cluster quote with unknown message"
      );
    const args = {
      quote: message as FireMessage,
      quoter: member as FireMember,
      webhook: data.webhook,
      debug: data.debug,
      destination,
    };
    this.manager.client.commandHandler.emit(
      CommandHandlerEvents.COMMAND_STARTED,
      message,
      quoteCommand,
      args
    );
    return await quoteCommand
      .exec(null, args)
      .then((ret) => {
        this.manager.client.commandHandler.emit(
          CommandHandlerEvents.COMMAND_FINISHED,
          message,
          quoteCommand,
          args,
          ret
        );
      })
      .catch((err) => {
        this.manager.client.commandHandler.emit(
          "commandError",
          message,
          quoteCommand,
          args,
          err
        );
      });
  }
}
