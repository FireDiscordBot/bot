import {
  MessageLinkMatch,
  PartialQuoteDestination,
} from "../../lib/interfaces/messages";
import { messageConverter } from "../../lib/util/converters";
import { MessageUtil } from "../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../lib/extensions/message";
import { EventType } from "../../lib/ws/util/constants";
import { FireGuild } from "../../lib/extensions/guild";
import { constants } from "../../lib/util/constants";
import { Listener } from "../../lib/util/listener";
import { TextChannel, Webhook } from "discord.js";
import Remind from "../commands/Utilities/remind";
import Quote from "../commands/Utilities/quote";
import { Message } from "../../lib/ws/Message";

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
      return;
    }

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
      await remindCommand
        .exec(message, {
          reminder: message.content.replace("--remind", " "),
        })
        .catch(() => {});
    }

    if (!message.guild.settings.get("utils.autoquote", false)) return;

    let matches: MessageLinkMatch[] = [];
    let messageLink: RegExpExecArray;
    while (
      (messageLink = regexes.discord.messageGlobal.exec(message.content))
    ) {
      if (messageLink)
        matches.push((messageLink.groups as unknown) as MessageLinkMatch);
    }

    const messageIds = matches.map((match) => match.message_id);
    matches = matches.filter(
      (match, pos) => messageIds.indexOf(match.message_id) == pos
    ); // remove dupes

    const quoteCommand = this.client.getCommand("quote") as Quote;

    for (const inhibitor of inhibitors) {
      if (inhibited) continue;
      let exec = inhibitor.exec(message, quoteCommand);
      if (this.client.util.isPromise(exec)) exec = await exec;
      if (exec) inhibited = true;
    }

    const shards = this.client.options.shards as number[];

    if (!inhibited) {
      for (const quote of matches) {
        if (!shards.includes(this.client.util.getShard(quote.guild_id))) {
          if (!this.client.manager.ws) return;
          const webhookURL = await this.getQuoteWebhookURL(
            message.channel as TextChannel
          );
          if (!webhookURL || typeof webhookURL != "string") return;
          this.client.manager.ws.send(
            MessageUtil.encode(
              new Message(EventType.CROSS_CLUSTER_QUOTE, {
                shard: this.client.util.getShard(quote.guild_id),
                quoter: message.author.id,
                webhook: webhookURL,
                message: quote,
                destination: {
                  nsfw: (message.channel as TextChannel)?.nsfw || false,
                } as PartialQuoteDestination,
              })
            )
          );
        }
        const convertedMessage = await messageConverter(
          message,
          null,
          true,
          quote
        ).catch(() => {});
        if (convertedMessage) {
          await quoteCommand
            .exec(message, { quote: convertedMessage })
            .catch(() => {});
          await this.client.util.sleep(500);
        }
      }
    }
  }

  async getQuoteWebhookURL(destination: TextChannel) {
    const hooks = await destination.fetchWebhooks().catch(() => {});
    let hook: Webhook;
    if (hooks) hook = hooks.filter((hook) => !!hook.token).first();
    if (!hook) {
      hook = await destination
        .createWebhook(`Fire Quotes #${destination.name}`, {
          avatar: this.client.user.displayAvatarURL({
            size: 2048,
            format: "png",
          }),
          reason: (destination.guild as FireGuild).language.get(
            "QUOTE_WEBHOOK_CREATE_REASON"
          ) as string,
        })
        .catch(() => null);
    }
    return hook?.url;
  }
}
