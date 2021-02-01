import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "../../lib/interfaces/messages";
import { messageConverter } from "../../lib/util/converters";
import { MessageUtil } from "../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../lib/extensions/message";
import { EventType } from "../../lib/ws/util/constants";
import { constants } from "../../lib/util/constants";
import { Listener } from "../../lib/util/listener";
import Remind from "../commands/Utilities/remind";
import Quote from "../commands/Utilities/quote";
import { Message } from "../../lib/ws/Message";
import { TextChannel } from "discord.js";

const { regexes } = constants;

export default class MessageInvalid extends Listener {
  botQuoteRegex: RegExp;
  slashCommandRegex: RegExp;

  constructor() {
    super("messageInvalid", {
      emitter: "commandHandler",
      event: "messageInvalid",
    });
    this.botQuoteRegex = /.{1,25}\s?quote (?:https?:\/\/)?(?:(?:ptb|canary|development)\.)?discord(?:app)?\.com\/channels\/(?:\d{15,21}\/?){3}/gim;
    this.slashCommandRegex = /<\/\w+:\d{15,21}>/gim;
  }

  async exec(message: FireMessage) {
    if (
      this.botQuoteRegex.test(message.content) ||
      this.slashCommandRegex.test(message.content) ||
      !message.guild ||
      message.editedAt
    ) {
      this.botQuoteRegex.lastIndex = 0;
      this.slashCommandRegex.lastIndex = 0;
      this.cleanCommandUtil(message);
      return;
    }

    this.botQuoteRegex.lastIndex = 0;
    this.slashCommandRegex.lastIndex = 0;

    let inhibited = false;
    const inhibitors = [...this.client.inhibitorHandler.modules.values()].sort(
      // @ts-ignore (idk why it thinks priority doesn't exist)
      (a, b) => b.priority - a.priority
    );

    if (message.content.includes("--remind")) {
      const remindCommand = this.client.getCommand("remind") as Remind;
      for (const inhibitor of inhibitors) {
        if (inhibited) continue;
        let exec = inhibitor.exec(message, remindCommand);
        if (this.client.util.isPromise(exec)) exec = await exec;
        if (exec) inhibited = true;
      }
      if (!inhibited) {
        await remindCommand
          .exec(message, {
            reminder: message.content.replace("--remind", " ").trimEnd(),
          })
          .catch(() => {});
      }
    }

    if (!message.guild.settings.get("utils.autoquote", false)) {
      this.cleanCommandUtil(message);
      return;
    }

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

    if (!matches.length) {
      this.cleanCommandUtil(message);
      return;
    }

    const messageIds = matches.map((match) => match.message_id);
    matches = matches.filter(
      (match, pos) => messageIds.indexOf(match.message_id) == pos
    ); // remove dupes

    const quoteCommand = this.client.getCommand("quote") as Quote;

    // reset inhibited
    inhibited = false;

    for (const inhibitor of inhibitors) {
      if (inhibited) continue;
      let exec = inhibitor.exec(message, quoteCommand);
      if (this.client.util.isPromise(exec)) exec = await exec;
      if (exec) inhibited = true;
    }

    if (inhibited) {
      this.cleanCommandUtil(message);
      return;
    }

    const shards = this.client.options.shards as number[];

    for (const quote of matches) {
      const shard = this.client.util.getShard(quote.guild_id);
      if (!shards.includes(shard)) {
        if (!this.client.manager.ws) continue;
        const webhookURL = await this.client.util.getQuoteWebhookURL(
          message.channel as TextChannel
        );
        if (!webhookURL || typeof webhookURL != "string") continue;
        this.client.console.info(
          `[Listener] Sending cross cluster quote request to shard ${shard} for guild ${quote.guild_id}`
        );
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
                  ? message.member?.permissions.bitfield || 0
                  : 0,
              } as PartialQuoteDestination,
            })
          )
        );
      } else {
        const convertedMessage = await messageConverter(
          message,
          null,
          true,
          quote
        ).catch(() => {});
        if (convertedMessage) {
          await quoteCommand
            .exec(message, { quote: convertedMessage as FireMessage })
            .catch(() => {});
          await this.client.util.sleep(500);
        }
      }
    }
  }

  cleanCommandUtil(message: FireMessage) {
    const util = message.util;
    if (!util.parsed?.command)
      this.client.commandHandler.commandUtils.delete(message.id);
  }
}
