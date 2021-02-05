import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "../../../lib/interfaces/messages";
import { SlashCommandMessage } from "../../../lib/extensions/slashCommandMessage";
import { FireMember } from "../../../lib/extensions/guildmember";
import { MessageUtil } from "../../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../../lib/extensions/message";
import { EventType } from "../../../lib/ws/util/constants";
import { TextChannel, WebhookClient } from "discord.js";
import { constants } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Message } from "../../../lib/ws/Message";

const { regexes } = constants;

export default class Quote extends Command {
  constructor() {
    super("quote", {
      description: (language: Language) =>
        language.get("QUOTE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
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
      enableSlashCommand: true,
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
          matches.push((messageLink.groups as unknown) as MessageLinkMatch);
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
            .getQuoteWebhookURL(
              message instanceof SlashCommandMessage
                ? (message.realChannel as TextChannel)
                : (message.channel as TextChannel)
            )
            .catch(() => {});
          if (!webhookURL || typeof webhookURL != "string") continue;
          this.client.console.info(
            `[Command] Sending cross cluster quote request to shard ${shard} for guild ${quote.guild_id}`
          );
          if (
            message.guild &&
            message.author?.id &&
            !message.member &&
            !message.webhookID
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
                  nsfw: (message.channel as TextChannel)?.nsfw || false,
                  permissions: message.guild
                    ? message.member.permissions.bitfield
                    : 0,
                } as PartialQuoteDestination,
              })
            )
          );
        }
      }
      return;
    }
    let webhook: WebhookClient;
    if (args.webhook && args.quoter) {
      const match = regexes.discord.webhook.exec(args.webhook);
      regexes.discord.webhook.lastIndex = 0;
      if (!match?.groups.id || !match?.groups.token) return;
      webhook = new WebhookClient(match.groups.id, match.groups.token);
      return await args.quote
        .quote(args.destination, args.quoter, webhook)
        .catch(() => {});
    } else if (!message) return;
    const quoted = await args.quote
      .quote(
        message instanceof SlashCommandMessage
          ? (message.realChannel as TextChannel)
          : (message.channel as TextChannel),
        message.member,
        webhook
      )
      .catch(() => {});
    if (args.debug && typeof quoted == "string")
      return await message.channel.send(quoted);
  }
}
