import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { Command } from "@fire/lib/util/command";
import { constants, GuildTextChannel } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { ThreadhookClient } from "@fire/lib/util/threadhookclient";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { MessageEmbed, Permissions, Snowflake } from "discord.js";

const { regexes } = constants;

export default class Quote extends Command {
  constructor() {
    super("quote", {
      description: (language: Language) =>
        language.get("QUOTE_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
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
      restrictTo: "guild",
    });
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
    if (!args?.quote) return;
    if (message)
      args.debug =
        args.debug || message.util.parsed.content.includes("debug.d");
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
    } else if (!message) return;
    const quoted = await args.quote
      .quote(
        message instanceof ApplicationCommandMessage
          ? (message.realChannel as GuildTextChannel)
          : (message.channel as GuildTextChannel),
        message.member,
        webhook,
        debugMessages
      )
      .catch((e) => (args.quoter?.isSuperuser() ? e.stack : e.message));
    if (quoted == "QUOTE_PREMIUM_INCREASED_LENGTH")
      return await message.error("QUOTE_PREMIUM_INCREASED_LENGTH");
    else if (quoted == "nsfw") return await message.error("QUOTE_NSFW_TO_SFW");
    else if (args.debug) {
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
}
