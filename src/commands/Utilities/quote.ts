import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "@fire/lib/interfaces/messages";
import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { WebhookClient, Permissions, Snowflake } from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";

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
                ? (message.realChannel as FireTextChannel)
                : (message.channel as FireTextChannel)
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
                  nsfw: (message.channel as FireTextChannel)?.nsfw || false,
                  permissions: message.guild
                    ? message.member.permissions.bitfield.toString()
                    : "0",
                  guild_id: message.guild?.id,
                  id: message.channel.id,
                } as PartialQuoteDestination,
                debug: args.debug,
              })
            )
          );
        }
      }
      return;
    }
    if (args.quote && args.quote.content.length > 2000)
      return await message.error("QUOTE_PREMIUM_INCREASED_LENGTH");
    let webhook: WebhookClient;
    if (args.webhook && args.quoter) {
      const match = regexes.discord.webhook.exec(args.webhook);
      regexes.discord.webhook.lastIndex = 0;
      if (!match?.groups.id || !match?.groups.token) return;
      webhook = new WebhookClient(
        match.groups.id as Snowflake,
        match.groups.token
      );
      const quoted = await args.quote
        .quote(args.destination, args.quoter, webhook)
        .catch((e) => (args.quoter?.isSuperuser() ? e.stack : e.message));
      if (args.debug && typeof quoted == "string")
        return !message
          ? await webhook.send(quoted)
          : await message.channel.send(quoted);
      else return;
    } else if (!message) return;
    const quoted = await args.quote
      .quote(
        message instanceof SlashCommandMessage
          ? (message.realChannel as FireTextChannel)
          : (message.channel as FireTextChannel),
        message.member,
        webhook
      )
      .catch((e) => (args.quoter?.isSuperuser() ? e.stack : e.message));
    if (args.debug && typeof quoted == "string")
      return !message
        ? await webhook.send(quoted)
        : await message.channel.send(quoted);
  }
}
