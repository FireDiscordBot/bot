import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireMessageContextMenuInteraction } from "@fire/lib/extensions/messagecontextmenuinteraction";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { Command } from "@fire/lib/util/command";
import { GuildTextChannel, constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { ThreadhookClient } from "@fire/lib/util/threadhookclient";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import {
  Collection,
  Constants,
  GuildChannelResolvable,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
  Snowflake,
} from "discord.js";

const { regexes } = constants;

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
      context: ["save to quote", "save to quote (preview)"],
      restrictTo: "all", // required for context cmd
      ephemeral: true, // context only
    });

    this.savedQuotes = new Collection();
    setInterval(() => {
      this.savedQuotes.sweep(
        (quote) => quote.quoteSavedAt < +new Date() - 60000
      );
    }, 30000);
  }

  async exec(
    message?: FireMessage,
    args?: {
      destination?: PartialQuoteDestination;
      quoter?: FireMember;
      quote: FireMessage | "cross_cluster";
      webhook?: string;
      debug?: boolean;
    }
  ) {
    if (!message.guild)
      return await message.error("COMMAND_GUILD_ONLY", {
        invite: this.client.config.inviteLink,
      });
    if (!args?.quote) return;
    let debugMessages: string[];
    if (args.debug) debugMessages = [];
    if (args.quote == "cross_cluster") {
      let matches: MessageLinkMatch[] = [];
      let messageLink: RegExpExecArray;
      while (
        (messageLink = regexes.discord.messageGlobal.exec(message.content))
      ) {
        if (
          messageLink &&
          !messageLink[0].startsWith("<") &&
          !messageLink[0].endsWith(">")
        )
          matches.push(messageLink.groups as unknown as MessageLinkMatch);
      }

      if (!matches.length) return;

      const messageIds = matches.map((match) => match.message_id);
      matches = matches.filter(
        (match, pos) => messageIds.indexOf(match.message_id) == pos
      ); // remove dupes

      const shards = this.client.options.shards as number[];

      for (const quote of matches) {
        const shard = this.client.util.getShard(quote.guild_id);
        if (!shards.includes(shard)) {
          if (!this.client.manager.ws?.open) continue;
          const webhookURL = await this.client.util
            .getQuoteWebhookURL(message.channel as GuildTextChannel)
            .catch(() => {});
          if (!webhookURL || typeof webhookURL != "string") continue;
          if (
            message.guild &&
            message.author?.id &&
            !message.member &&
            !message.webhookId
          )
            // ensure member is cached so message.member.permissions works
            await message.guild.members.fetch(message.author).catch(() => {});
          this.client.manager.ws.send(
            MessageUtil.encode(
              new Message(EventType.CROSS_CLUSTER_QUOTE, {
                shard,
                quoter: message.author.id,
                webhook: webhookURL,
                message: quote,
                destination: {
                  nsfw: (message.channel as FireTextChannel)?.nsfw || false,
                  permissions: message.guild
                    ? message.member.permissions.bitfield.toString()
                    : "0",
                  guild_id: message.guild?.id,
                  id: message.channelId,
                } as PartialQuoteDestination,
                debug: args.debug,
              })
            )
          );
        }
      }
      return;
    }
    if (args.quote.content.length > 2000)
      return await message.error("QUOTE_PREMIUM_INCREASED_LENGTH");
    let webhook: ThreadhookClient;
    if (args.webhook && args.quoter) {
      const match = regexes.discord.webhook.exec(args.webhook);
      regexes.discord.webhook.lastIndex = 0;
      if (!match?.groups.id || !match?.groups.token) return;
      webhook = new ThreadhookClient(
        { id: match.groups.id as Snowflake, token: match.groups.token },
        { threadId: match.groups.threadId as Snowflake }
      );
      return await args.quote
        .quote(args.destination, args.quoter, webhook, debugMessages)
        .catch(() => {});
    }
    const quoted = await args.quote
      .quote(
        message instanceof ApplicationCommandMessage
          ? (message.realChannel as GuildTextChannel)
          : (message.channel as GuildTextChannel),
        message.member,
        webhook,
        debugMessages
      )
      .catch((e: Error) =>
        (args.quoter ?? message.author).isSuperuser() ? e.stack : e.message
      );
    if (quoted == "QUOTE_PREMIUM_INCREASED_LENGTH")
      return await message.error("QUOTE_PREMIUM_INCREASED_LENGTH");
    else if (quoted == "nsfw") return await message.error("QUOTE_NSFW_TO_SFW");
    if (typeof quoted == "string" && debugMessages) debugMessages.push(quoted);
    if (args.debug) {
      if (!debugMessages.length) return;
      const content = debugMessages.join("\n");
      if (content.length > 2000 && content.length < 4096)
        return await message.channel.send({
          embeds: [new MessageEmbed().setDescription(content)],
        });
      else if (content.length <= 2000)
        return await message.channel.send(content);
    }
  }

  // Slash & Context commands will always try Command#run first
  // so we can use that to have a separate context handler as quote is not a slash command
  async run(command: ContextCommandMessage) {
    command.flags = 64;

    if (
      command.guild &&
      command.guild.members.me
        .permissionsIn(command.channel.real as GuildChannelResolvable)
        .has(Permissions.FLAGS.VIEW_CHANNEL)
    )
      return await command.error("QUOTE_SAVE_NOT_NEEDED");

    const interaction =
        command.contextCommand as FireMessageContextMenuInteraction,
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
      !interaction.rawGuild.features.includes("DISCOVERABLE") &&
      !constants.allowedInvites.includes(interaction.rawGuild.id) &&
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
      `${channelType == "DM" ? "@me" : command.guildId}/${
        messageToSave.channelId
      }/${messageToSave.id}`,
      messageToSave
    );

    // temp
    return await command.success("QUOTE_SAVED_SUCCESS", {
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("QUOTE_SAVE_BUTTON_LABEL"))
            .setURL(
              `https://discord.com/channels/${
                channelType == "DM" ? "@me" : command.guildId
              }/${messageToSave.channelId}/${messageToSave.id}`
            )
        ),
      ],
    });
  }
}
