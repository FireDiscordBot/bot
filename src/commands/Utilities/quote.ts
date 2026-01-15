import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageContextMenuInteraction } from "@fire/lib/extensions/messagecontextmenuinteraction";
import { FireUser } from "@fire/lib/extensions/user";
import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { Command } from "@fire/lib/util/command";
import { GuildTextChannel, constants } from "@fire/lib/util/constants";
import { messageConverter } from "@fire/lib/util/converters";
import { Language } from "@fire/lib/util/language";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { Constants as AkairoConstants } from "discord-akairo";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  Collection,
  Constants,
  GuildChannelResolvable,
  GuildTextBasedChannel,
  MessageActionRow,
  MessageButton,
  ThreadChannel,
  WebhookClient,
} from "discord.js";

const { CommandHandlerEvents } = AkairoConstants;

export default class Quote extends Command {
  savedQuotes: Collection<string, FireMessage>;

  constructor() {
    super("quote", {
      description: (language: Language) =>
        language.get("QUOTE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "quote",
          type: "message",
          required: true,
          default: null,
        },
        {
          id: "debug",
          match: "flag",
          flag: "--debug",
          default: false,
        },
      ],
      context: ["save to quote"],
      restrictTo: "all", // required for context cmd
      ephemeral: true, // context only
      slashOnly: true,
      hidden: true,
    });

    this.savedQuotes = new Collection();
    setInterval(() => {
      this.savedQuotes.sweep(
        (quote) => quote.quoteSavedAt < +new Date() - 60000
      );
    }, 30000);
  }

  async handleLocalQuote(
    message: FireMessage,
    match: MessageLinkMatch,
    debug = false // TODO: reimplement debug messages
  ) {
    const convertedMessage = await messageConverter(
      message,
      null,
      !debug,
      match
    ).catch(() => {});
    if (!convertedMessage) return;
    else if (
      convertedMessage.reference?.type ==
        Constants.MessageReferenceType.FORWARD &&
      convertedMessage.reference?.guildId
    ) {
      const { reference } = convertedMessage;
      const shard = this.client.util.getShard(reference.guildId);
      if (!(this.client.options.shards as number[]).includes(shard))
        return this.forwardCrossClusterQuote(message, {
          guild_id: reference.guildId,
          channel_id: reference.channelId,
          message_id: reference.messageId,
        });
      const guild = this.client.guilds.cache.get(
        reference.guildId
      ) as FireGuild;
      if (!guild) return;
      const channel = guild.channels.cache.get(
        reference.channelId
      ) as GuildTextBasedChannel;
      if (!channel) return;
      const referencedMessage = (await channel.messages
        .fetch(reference.messageId)
        .catch(() => {})) as FireMessage;
      if (!referencedMessage) return;
      else
        await this.quoteWithCommandEvents(
          message,
          referencedMessage,
          message.channel as GuildTextBasedChannel,
          message.member ?? message.author
        );
    } else if (
      convertedMessage.reference?.type != Constants.MessageReferenceType.FORWARD
    ) {
      await this.quoteWithCommandEvents(
        message,
        convertedMessage,
        message.channel as GuildTextBasedChannel,
        message.member ?? message.author
      );
      if (match.iteratedMessages?.length)
        for (const iterated of match.iteratedMessages) {
          await this.quoteWithCommandEvents(
            message,
            iterated,
            message.channel as GuildTextBasedChannel,
            message.member ?? message.author
          );
        }
    }
  }

  async forwardCrossClusterQuote(
    message: FireMessage,
    quote: MessageLinkMatch
  ) {
    const shard = this.client.util.getShard(quote.guild_id);
    const webhook = await this.client.util.getQuoteWebhookURL(
      message.channel as GuildTextChannel,
      message.hasInteractiveComponents()
    );
    this.console.log("Forwarding cross-cluster quote", {
      user: `${message.author} (${message.author.id})`,
      guild: `${message.guild} (${message.guild.id})`,
      source: `${quote.guild_id}/${quote.channel_id}/${quote.message_id}`,
      destination: `${message.guild.id}/${
        "parent" in message.channel
          ? message.channel.parentId
          : message.channel.id
      }${
        message.channel instanceof ThreadChannel
          ? `?thread_id=${message.channel.id}`
          : ""
      }`,
      shard,
    });
    this.client.manager.ws.send(
      MessageUtil.encode(
        new Message(EventType.CROSS_CLUSTER_QUOTE, {
          shard,
          quoter: message.author.id,
          webhook,
          message: quote,
          destination: {
            nsfw: (message.channel as GuildTextChannel)?.nsfw || false,
            permissions: message.guild
              ? message.member?.permissions.bitfield.toString() || "0"
              : "0",
            guild_id: message.guild?.id,
            id: message.channelId,
          } as PartialQuoteDestination,
        })
      )
    );
  }

  returnCrossClusterQuote(
    destination: PartialQuoteDestination,
    quote: MessageLinkMatch,
    quoter: Snowflake,
    webhook: {
      id: Snowflake;
      token: string;
      threadId?: Snowflake;
    }
  ) {
    const shard = this.client.util.getShard(destination.guild_id);
    this.console.log(
      "Returning cross cluster quote due to forwarded message on another cluster",
      {
        quoter,
        quote,
        shard,
      }
    );
    this.client.manager.ws.send(
      MessageUtil.encode(
        new Message(EventType.CROSS_CLUSTER_QUOTE, {
          shard,
          quoter,
          webhook,
          message: quote,
          destination,
        })
      )
    );
  }

  async quoteWithCommandEvents(
    context: FireMessage,
    message: FireMessage,
    destination: GuildTextBasedChannel | PartialQuoteDestination,
    quoter: FireMember | FireUser,
    webhook?: WebhookClient,
    debug?: string[]
  ) {
    const args = {
      message: `${message.guildId ?? "@me"}/${message.channelId}/${message.id}`,
    };
    this.client.commandHandler.emit(
      CommandHandlerEvents.COMMAND_STARTED,
      context,
      this,
      args
    );
    await message
      .quote(destination, quoter, webhook, debug)
      .then((returnVal: unknown) =>
        this.client.commandHandler.emit(
          CommandHandlerEvents.COMMAND_FINISHED,
          context,
          this,
          args,
          returnVal
        )
      )
      .catch((error: Error) =>
        this.client.commandHandler.emit(
          "commandError",
          context,
          this,
          args,
          error
        )
      );
  }

  // Slash & Context commands will always try Command#run first
  // so we can use that to have a separate context handler as quote is not a slash command
  async run(
    command: ContextCommandMessage | FireMessage | ApplicationCommandMessage
  ) {
    if (!(command instanceof ContextCommandMessage))
      if (
        command instanceof FireMessage ||
        command instanceof ApplicationCommandMessage
      )
        return await command.error("COMMAND_ERROR_INVALID_CONTEXT");
      else return;
    command.flags = 64;

    if (
      command.guild &&
      command.channel.real &&
      command.guild.members.me
        .permissionsIn(command.channel.real as GuildChannelResolvable)
        .has(PermissionFlagsBits.ViewChannel)
    )
      return await command.error("QUOTE_SAVE_NOT_NEEDED");

    const interaction = command.contextCommand as MessageContextMenuInteraction,
      messageToSave = command.getMessage() as FireMessage;

    // Currently, we need either content, embeds or attachments for a message to be quoted
    if (
      !messageToSave.content &&
      !messageToSave.embeds.length &&
      !messageToSave.attachments.size &&
      !messageToSave.components.length
    )
      return await command.error("QUOTE_NO_CONTENT_TO_SAVE");

    if (
      command.contextCommand.commandName.endsWith("(Preview)") &&
      !interaction.rawGuild?.features.includes("DISCOVERABLE") &&
      !constants.allowedInvites.includes(interaction.rawGuild?.id) &&
      !command.author.isSuperuser()
    )
      return await command.error("QUOTE_SAVE_PREVIEW_NOT_DISCOVERABLE");

    const currenlySaved = this.savedQuotes.filter(
      (q) => q.savedToQuoteBy == command.author.id
    );
    if (currenlySaved.size > 5 && !command.author.premium) {
      const sortedByDate = currenlySaved
        .sort((a, b) => a.quoteSavedAt - b.quoteSavedAt)
        .map((q) => q.id);
      this.savedQuotes.sweep(
        (q) =>
          sortedByDate.indexOf(q.id) < sortedByDate.length - 5 &&
          q.savedToQuoteBy == command.author.id
      );
    } else if (currenlySaved.size > 10 && !command.author.isSuperuser()) {
      const sortedByDate = currenlySaved
        .sort((a, b) => a.quoteSavedAt - b.quoteSavedAt)
        .map((q) => q.id);
      this.savedQuotes.sweep(
        (q) =>
          sortedByDate.indexOf(q.id) < sortedByDate.length - 10 &&
          q.savedToQuoteBy == command.author.id
      );
    }

    const rawChannel = interaction.rawChannel;
    const channelType = Constants.ChannelTypes[rawChannel.type];

    messageToSave.isSavedToQuote = true; // used to identify a saved message
    messageToSave.savedToQuoteBy = command.author.id; // used to identify who saved the message
    messageToSave.quoteSavedAt = +new Date();
    messageToSave.savedQuoteData = {
      nsfw: "nsfw" in rawChannel ? rawChannel.nsfw : false,
      name: "name" in rawChannel ? rawChannel.name : "Unknown",
    };

    this.savedQuotes.set(
      `${
        channelType == "DM" || channelType == "GROUP_DM"
          ? "@me"
          : command.guildId
      }/${messageToSave.channelId}/${messageToSave.id}`,
      messageToSave
    );

    return await command.success("QUOTE_SAVED_SUCCESS", {
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("QUOTE_SAVE_BUTTON_LABEL"))
            .setURL(
              `https://discord.com/channels/${
                channelType == "DM" || channelType == "GROUP_DM"
                  ? "@me"
                  : command.guildId
              }/${messageToSave.channelId}/${messageToSave.id}`
            )
        ),
      ],
    });
  }
}
